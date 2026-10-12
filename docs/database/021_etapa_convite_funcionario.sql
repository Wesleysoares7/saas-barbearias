-- Etapa 21: convite de equipe com cadastro de funcionario + aceite atomico
-- Execute no Supabase SQL Editor APOS 001..020. Seguro para reexecucao.
-- So ADICIONA colunas e uma funcao: o app antigo continua funcionando ate voce publicar o novo.
--
-- Problema corrigido:
--   * Aceitar um convite criava so o PERFIL (acesso ao sistema). A pessoa nunca aparecia em
--     Funcionarios, entao nao podia ser escolhida na agenda nem receber comissao.
--   * O aceite fazia varios passos separados no app (perfil, convite, auditoria). Agora e uma funcao
--     unica: ou grava tudo, ou nao grava nada. As mensagens de erro (P0001) sao em portugues.
--
-- Conceitos:
--   profiles  = quem entra no sistema (acesso: Administrador ou Equipe)
--   employees = quem ATENDE clientes (aparece na agenda, tem comissao)
--   Uma pessoa pode ser as duas coisas (barbeiro com login), so a primeira (recepcao/gerente)
--   ou so a segunda (barbeiro sem login). O convite agora diz se a pessoa atende clientes.

-- ---------------------------------------------------------------- colunas do convite
alter table public.team_invites
  add column if not exists nome text,
  add column if not exists telefone text,
  add column if not exists percentual_comissao numeric(5,2),
  add column if not exists atende_clientes boolean not null default false;

alter table public.team_invites drop constraint if exists team_invites_nome_length;
alter table public.team_invites
  add constraint team_invites_nome_length
  check (nome is null or char_length(nome) <= 120);

alter table public.team_invites drop constraint if exists team_invites_telefone_length;
alter table public.team_invites
  add constraint team_invites_telefone_length
  check (telefone is null or char_length(telefone) <= 30);

alter table public.team_invites drop constraint if exists team_invites_comissao_range;
alter table public.team_invites
  add constraint team_invites_comissao_range
  check (percentual_comissao is null or (percentual_comissao >= 0 and percentual_comissao <= 100));

-- ---------------------------------------------------------------- guarda (substitui a da etapa 15)
-- O convidado so pode mudar status/accepted_*; nunca os dados do convite.
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
     or new.invited_by is distinct from old.invited_by
     or new.nome is distinct from old.nome
     or new.telefone is distinct from old.telefone
     or new.percentual_comissao is distinct from old.percentual_comissao
     or new.atende_clientes is distinct from old.atende_clientes then
    raise exception 'Convidado nao pode alterar dados do convite.';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------- aceite atomico
create or replace function public.accept_team_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_invite public.team_invites%rowtype;
  v_profile_company uuid;
  v_nome text;
  v_employee_id uuid;
begin
  if v_uid is null or v_email = '' then
    raise exception 'Sua sessao expirou. Faca login novamente para aceitar o convite.';
  end if;

  if p_token is null or btrim(p_token) = '' then
    raise exception 'Token de convite invalido.';
  end if;

  -- Trava o convite: duplo clique ou duas abas nao aceitam duas vezes.
  select * into v_invite
  from public.team_invites
  where token = btrim(p_token)
  for update;

  if not found then
    raise exception 'Convite nao encontrado ou indisponivel para sua conta.';
  end if;

  if v_invite.email <> v_email then
    raise exception 'Este convite foi enviado para outro e-mail.';
  end if;

  -- Idempotente: ja aceito devolve a mesma empresa.
  if v_invite.status = 'accepted' then
    return v_invite.company_id;
  end if;

  if v_invite.status = 'revoked' then
    raise exception 'Este convite foi revogado pelo administrador.';
  end if;

  if v_invite.status = 'expired' or v_invite.expires_at < now() then
    raise exception 'Este convite expirou. Solicite um novo convite ao administrador.';
  end if;

  select p.company_id into v_profile_company
  from public.profiles p
  where p.id = v_uid;

  if v_profile_company is not null and v_profile_company <> v_invite.company_id then
    raise exception 'Sua conta ja esta vinculada a outra empresa. Use outro usuario para aceitar este convite.';
  end if;

  -- Nome: o informado pelo administrador no convite; senao o do cadastro; senao o inicio do e-mail.
  v_nome := left(
    btrim(coalesce(
      nullif(btrim(coalesce(v_invite.nome, '')), ''),
      nullif(btrim(coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', '')), ''),
      nullif(btrim(coalesce(auth.jwt() -> 'user_metadata' ->> 'name', '')), ''),
      split_part(v_email, '@', 1),
      ''
    )),
    120
  );

  if char_length(v_nome) < 2 then
    v_nome := 'Novo membro';
  end if;

  -- Perfil (acesso). Ordem importante: o convite ainda esta pendente aqui, e as travas da etapa 15
  -- exigem convite valido para o papel.
  if v_profile_company is null then
    insert into public.profiles (id, company_id, nome, email, role)
    values (v_uid, v_invite.company_id, v_nome, v_email, v_invite.role);
  else
    update public.profiles
    set role = v_invite.role
    where id = v_uid
      and company_id = v_invite.company_id
      and role is distinct from v_invite.role;
  end if;

  -- Funcionario (quem atende clientes): vincula um cadastro existente com o mesmo e-mail,
  -- ou cria um novo. Nunca duplica.
  if v_invite.atende_clientes then
    select e.id into v_employee_id
    from public.employees e
    where e.company_id = v_invite.company_id
      and e.user_id = v_uid
    limit 1;

    if v_employee_id is null then
      select e.id into v_employee_id
      from public.employees e
      where e.company_id = v_invite.company_id
        and e.user_id is null
        and lower(coalesce(e.email, '')) = v_email
      order by e.created_at
      limit 1;

      if v_employee_id is not null then
        update public.employees
        set user_id = v_uid,
            email = coalesce(email, v_email)
        where id = v_employee_id;
      end if;
    end if;

    if v_employee_id is null then
      insert into public.employees (company_id, user_id, nome, email, telefone, percentual_comissao, ativo)
      values (v_invite.company_id, v_uid, v_nome, v_email, v_invite.telefone, v_invite.percentual_comissao, true)
      returning id into v_employee_id;
    end if;
  end if;

  update public.team_invites
  set status = 'accepted',
      accepted_by = v_uid,
      accepted_at = now()
  where id = v_invite.id
    and status = 'pending';

  insert into public.audit_logs (company_id, actor_id, action, entity, entity_id, metadata)
  values (
    v_invite.company_id,
    v_uid,
    'team_invite_accepted',
    'team_invites',
    v_invite.id::text,
    jsonb_build_object(
      'email', v_email,
      'role', v_invite.role,
      'atende_clientes', v_invite.atende_clientes,
      'employee_id', v_employee_id
    )
  );

  return v_invite.company_id;
end;
$$;

revoke all on function public.accept_team_invite(text) from public;
revoke all on function public.accept_team_invite(text) from anon;
grant execute on function public.accept_team_invite(text) to authenticated;

-- ---------------------------------------------------------------- OPCIONAL: membros que ja existem
-- Quem ja aceitou convite ANTES desta etapa tem acesso, mas nao aparece em Funcionarios.
-- Previa (quem seria afetado: membros "Equipe" sem cadastro de funcionario):
--   select c.nome as empresa, p.nome, p.email
--   from public.profiles p
--   join public.companies c on c.id = p.company_id
--   where p.role = 'employee'
--     and not exists (
--       select 1 from public.employees e
--       where e.company_id = p.company_id and e.user_id = p.id
--     )
--   order by c.nome, p.nome;
--
-- B1) vincula cadastros de funcionario ja existentes (mesmo e-mail, ainda sem usuario):
--   update public.employees e
--   set user_id = p.id
--   from public.profiles p
--   where p.role = 'employee'
--     and e.company_id = p.company_id
--     and e.user_id is null
--     and lower(coalesce(e.email, '')) = lower(p.email)
--     and not exists (
--       select 1 from public.employees x where x.company_id = p.company_id and x.user_id = p.id
--     );
--
-- B2) cria funcionario para os demais membros "Equipe" (comissao fica em branco):
--   insert into public.employees (company_id, user_id, nome, email, ativo)
--   select p.company_id, p.id, p.nome, p.email, true
--   from public.profiles p
--   where p.role = 'employee'
--     and not exists (
--       select 1 from public.employees e where e.company_id = p.company_id and e.user_id = p.id
--     );

-- ---------------------------------------------------------------- testes (SQL Editor, um bloco por vez)
-- Crie um convite pendente de teste (SQL Editor, sem jwt) para um e-mail de uma conta de teste que AINDA
-- NAO tenha perfil, com atende_clientes = true:
--   insert into public.team_invites (company_id, email, role, token, status, expires_at, nome, atende_clientes)
--   values ('<COMPANY_ID>', 'teste@exemplo.com', 'employee', 'tokenteste123', 'pending',
--           now() + interval '7 days', 'Fulano Barbeiro', true);
--
-- T1) Aceite completo (cria perfil + funcionario + marca o convite):
--   begin;
--   select set_config('request.jwt.claims',
--     json_build_object('sub','<ID_DO_USUARIO_TESTE>','role','authenticated','email','teste@exemplo.com')::text, true);
--   set local role authenticated;
--   select public.accept_team_invite('tokenteste123');
--   select nome, role from public.profiles where id = '<ID_DO_USUARIO_TESTE>';
--   select nome, user_id from public.employees where user_id = '<ID_DO_USUARIO_TESTE>';
--   select status from public.team_invites where token = 'tokenteste123';
--   rollback;
--
-- T2) Idempotencia: chamar duas vezes na mesma transacao devolve o mesmo company_id, sem funcionario duplicado.
-- T3) E-mail diferente do convite -> ERRO "Este convite foi enviado para outro e-mail."
-- T4) Convite com atende_clientes = false -> perfil criado e NENHUM funcionario.
-- T5) Funcionario ja cadastrado com o mesmo e-mail (user_id nulo) -> e vinculado, nao duplicado.