-- Etapa 15: endurecimento de permissoes (profiles, convites, companies, employees, services)
-- Execute no Supabase SQL Editor APOS 001..014. Seguro para reexecucao.
-- Teste primeiro em um projeto de desenvolvimento ou faca backup.
--
-- Problemas corrigidos:
--   1) Funcionario podia virar admin (UPDATE no proprio profiles.role).
--   2) Qualquer usuario logado podia inserir um profile em QUALQUER empresa, com role admin.
--   3) Convidado podia alterar role/token do proprio convite.
--   4) Funcionario podia criar/editar/excluir funcionarios e servicos direto pela API.
--   5) Qualquer usuario logado podia criar empresas ilimitadas.
--
-- O codigo do app NAO precisa mudar: onboarding, aceite de convite e troca de papel
-- continuam funcionando, agora com as regras garantidas no banco.
-- Service role e SQL Editor (auth.uid() nulo) continuam livres para manutencao.

-- ---------------------------------------------------------------- helpers
-- SECURITY DEFINER e obrigatorio: uma subconsulta comum em profiles seria filtrada
-- pelo RLS e nunca enxergaria membros de outras empresas.

create or replace function public.is_company_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = public.current_company_id()
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_company_admin() from public;
grant execute on function public.is_company_admin() to authenticated;

create or replace function public.company_has_profiles(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p where p.company_id = p_company_id
  );
$$;

revoke all on function public.company_has_profiles(uuid) from public;
grant execute on function public.company_has_profiles(uuid) to authenticated;

create or replace function public.has_valid_invite(p_company_id uuid, p_role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_invites i
    where i.company_id = p_company_id
      and i.role = p_role
      and lower(i.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and i.status = 'pending'
      and i.expires_at > now()
  );
$$;

revoke all on function public.has_valid_invite(uuid, public.user_role) from public;
grant execute on function public.has_valid_invite(uuid, public.user_role) to authenticated;

-- ---------------------------------------------------------------- profiles: trigger de guarda
create or replace function public.guard_profiles_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_other_admins integer;
begin
  -- service role / SQL Editor: sem usuario logado, nao restringe.
  if v_uid is null then
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'Nao e permitido alterar o id do perfil.';
  end if;

  if new.company_id is distinct from old.company_id then
    raise exception 'Nao e permitido trocar a empresa do perfil.';
  end if;

  if new.email is distinct from old.email then
    raise exception 'Nao e permitido alterar o e-mail do perfil.';
  end if;

  if new.role is distinct from old.role then
    select exists (
      select 1
      from public.profiles p
      where p.id = v_uid
        and p.company_id = old.company_id
        and p.role = 'admin'
    ) into v_is_admin;

    -- Nao-admin so muda o proprio papel se houver convite valido para esse papel.
    if not v_is_admin then
      if not (old.id = v_uid and public.has_valid_invite(old.company_id, new.role)) then
        raise exception 'Apenas administradores podem alterar papeis.';
      end if;
    end if;

    -- Garantia no banco: a empresa nunca fica sem administrador.
    if old.role = 'admin' and new.role <> 'admin' then
      select count(*) into v_other_admins
      from public.profiles p
      where p.company_id = old.company_id
        and p.role = 'admin'
        and p.id <> old.id;

      if v_other_admins = 0 then
        raise exception 'A empresa precisa manter pelo menos um administrador.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_guard_update on public.profiles;
create trigger trg_profiles_guard_update
before update on public.profiles
for each row execute function public.guard_profiles_update();

-- ---------------------------------------------------------------- profiles: policies
drop policy if exists profiles_insert_self_bootstrap on public.profiles;
drop policy if exists profiles_insert_admin_same_company on public.profiles;
drop policy if exists profiles_insert_bootstrap_or_invite on public.profiles;
drop policy if exists profiles_update_own_or_admin_same_company on public.profiles;

-- INSERT: o proprio usuario, com o e-mail do login, e so em um destes casos:
--   a) onboarding: empresa recem-criada, ainda sem nenhum perfil, entrando como admin;
--   b) convite: existe convite pendente e valido para o e-mail dele, com aquele papel.
create policy profiles_insert_bootstrap_or_invite
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  and email = lower(coalesce(auth.jwt() ->> 'email', ''))
  and (
    (role = 'admin' and not public.company_has_profiles(company_id))
    or public.has_valid_invite(company_id, role)
  )
);

-- UPDATE: o proprio perfil ou admin da mesma empresa. O trigger acima trava
-- id, company_id, email e controla mudanca de papel.
create policy profiles_update_own_or_admin_same_company
on public.profiles
for update
to authenticated
using (
  company_id = public.current_company_id()
  and (id = auth.uid() or public.is_company_admin())
)
with check (company_id = public.current_company_id());

-- Nao existe policy de DELETE (RLS ja bloqueia); remove o privilegio tambem.
revoke delete on public.profiles from authenticated;

-- ---------------------------------------------------------------- team_invites: trigger de guarda
-- O convidado so pode mudar status/accepted_*; nunca role, empresa, e-mail ou token.
create or replace function public.guard_team_invites_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return new;
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.id = v_uid
      and p.company_id = old.company_id
      and p.role = 'admin'
  ) then
    return new;
  end if;

  if new.company_id is distinct from old.company_id
     or new.email is distinct from old.email
     or new.role is distinct from old.role
     or new.token is distinct from old.token
     or new.expires_at is distinct from old.expires_at
     or new.invited_by is distinct from old.invited_by then
    raise exception 'Convidado nao pode alterar dados do convite.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_team_invites_guard_update on public.team_invites;
create trigger trg_team_invites_guard_update
before update on public.team_invites
for each row execute function public.guard_team_invites_update();

-- ---------------------------------------------------------------- companies: criar so quem ainda nao tem empresa
drop policy if exists companies_insert_authenticated on public.companies;
drop policy if exists companies_insert_without_company on public.companies;

create policy companies_insert_without_company
on public.companies
for insert
to authenticated
with check (public.current_company_id() is null);

-- ---------------------------------------------------------------- employees e services: escrita so admin
drop policy if exists employees_crud_same_company on public.employees;
drop policy if exists employees_select_same_company on public.employees;
drop policy if exists employees_insert_admin on public.employees;
drop policy if exists employees_update_admin on public.employees;
drop policy if exists employees_delete_admin on public.employees;

create policy employees_select_same_company on public.employees
for select to authenticated
using (company_id = public.current_company_id());

create policy employees_insert_admin on public.employees
for insert to authenticated
with check (company_id = public.current_company_id() and public.is_company_admin());

create policy employees_update_admin on public.employees
for update to authenticated
using (company_id = public.current_company_id() and public.is_company_admin())
with check (company_id = public.current_company_id());

create policy employees_delete_admin on public.employees
for delete to authenticated
using (company_id = public.current_company_id() and public.is_company_admin());

drop policy if exists services_crud_same_company on public.services;
drop policy if exists services_select_same_company on public.services;
drop policy if exists services_insert_admin on public.services;
drop policy if exists services_update_admin on public.services;
drop policy if exists services_delete_admin on public.services;

create policy services_select_same_company on public.services
for select to authenticated
using (company_id = public.current_company_id());

create policy services_insert_admin on public.services
for insert to authenticated
with check (company_id = public.current_company_id() and public.is_company_admin());

create policy services_update_admin on public.services
for update to authenticated
using (company_id = public.current_company_id() and public.is_company_admin())
with check (company_id = public.current_company_id());

create policy services_delete_admin on public.services
for delete to authenticated
using (company_id = public.current_company_id() and public.is_company_admin());

-- ---------------------------------------------------------------- testes (rodar no SQL Editor, um bloco por vez)
-- Troque os UUIDs/e-mails por usuarios reais de teste. Cada bloco termina em ROLLBACK
-- (nao altera dados). Se um comando falhar, o resultado esperado e o ERRO indicado;
-- depois rode "rollback;" para limpar a transacao.
--
-- T1) Funcionario tentando virar admin  -> ERRO "Apenas administradores podem alterar papeis."
--   begin;
--   select set_config('request.jwt.claims',
--     json_build_object('sub','<ID_FUNCIONARIO>','role','authenticated','email','<EMAIL_FUNCIONARIO>')::text, true);
--   set local role authenticated;
--   update public.profiles set role = 'admin' where id = '<ID_FUNCIONARIO>';
--   rollback;
--
-- T2) Usuario sem empresa tentando entrar como admin de empresa existente -> ERRO (RLS, "new row violates")
--   begin;
--   select set_config('request.jwt.claims',
--     json_build_object('sub','<ID_USUARIO_SEM_PERFIL>','role','authenticated','email','<EMAIL_DELE>')::text, true);
--   set local role authenticated;
--   insert into public.profiles (id, company_id, nome, email, role)
--     values ('<ID_USUARIO_SEM_PERFIL>', '<ID_EMPRESA_EXISTENTE>', 'x', '<EMAIL_DELE>', 'admin');
--   rollback;
--
-- T3) Admin unico rebaixando a si mesmo -> ERRO "A empresa precisa manter pelo menos um administrador."
--   (rodar como admin unico da empresa; o app ja bloqueia, agora o banco tambem)
--
-- T4) Funcionario inserindo servico -> ERRO (RLS)
--   insert into public.services (company_id, nome, duracao, valor) values ('<EMPRESA>', 'x', 30, 10);
--
-- Teste de fluxo no app (obrigatorio antes de ir para producao):
--   cadastro novo + onboarding | convidar funcionario + aceitar convite em outro e-mail |
--   admin muda papel de um membro | funcionario cria/conclui agendamento.