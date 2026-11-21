-- Etapa 26: dados da empresa (alinha scripts com o banco real) + permissoes + auditoria
-- Execute no Supabase SQL Editor APOS 001..025. Seguro para reexecucao.
--
-- O que faz:
--  1) Registra nos scripts as colunas e regras que ja existem no banco real
--     (email_contato, cidade, uf e os checks de tamanho/formato).
--  2) Restringe as permissoes de companies: o admin so ATUALIZA 8 colunas e nao apaga nada.
--     Colunas novas nascem protegidas (precisam de GRANT explicito).
--  3) Fecha permissoes soltas em audit_logs e impede o admin de forjar o autor do registro.
--  4) Registra automaticamente (antes/depois) toda alteracao em companies, inclusive as feitas
--     pela plataforma (master/modo suporte/SQL Editor), marcadas com via = 'plataforma'.

-- ---------------------------------------------------------------- 1) colunas e regras
alter table public.companies
  add column if not exists email_contato text,
  add column if not exists cidade text,
  add column if not exists uf text;

alter table public.companies drop constraint if exists companies_nome_length;
alter table public.companies drop constraint if exists companies_telefone_length;
alter table public.companies drop constraint if exists companies_endereco_length;
alter table public.companies drop constraint if exists companies_cidade_length;
alter table public.companies drop constraint if exists companies_uf_format;
alter table public.companies drop constraint if exists companies_email_contato_format;

alter table public.companies
  add constraint companies_nome_length check (char_length(nome) <= 120),
  add constraint companies_telefone_length check (telefone is null or char_length(telefone) <= 30),
  add constraint companies_endereco_length check (endereco is null or char_length(endereco) <= 200),
  add constraint companies_cidade_length check (cidade is null or char_length(cidade) <= 60),
  add constraint companies_uf_format check (uf is null or uf ~ '^[A-Z]{2}$'),
  add constraint companies_email_contato_format check (
    email_contato is null
    or (char_length(email_contato) <= 120 and email_contato ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
  );

-- ---------------------------------------------------------------- 2) permissoes de companies
-- anon nunca precisa acessar a tabela; authenticated le (RLS limita a propria empresa) e atualiza so a lista abaixo.
-- Plano, status, teste, suspensao e cortesia continuam fora da lista (e protegidos tambem pelo gatilho de 020).
revoke all on public.companies from anon;
revoke all on public.companies from authenticated;
grant select on public.companies to authenticated;
grant update (nome, logo, telefone, endereco, cidade, uf, email_contato, tema)
  on public.companies to authenticated;

-- ---------------------------------------------------------------- 3) permissoes de audit_logs
revoke all on public.audit_logs from anon;
revoke update, delete, truncate, references, trigger on public.audit_logs from authenticated;
-- authenticated continua com select e insert (RLS limita a propria empresa).

-- Usuario logado nao escolhe autor nem data: o banco grava quem realmente fez e quando.
-- Chamadas sem usuario (service role / modo suporte / SQL Editor) seguem como o app informar.
create or replace function public.audit_logs_enforce_actor()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null then
    new.actor_id := auth.uid();
    new.created_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_audit_logs_enforce_actor on public.audit_logs;
create trigger trg_audit_logs_enforce_actor
before insert on public.audit_logs
for each row execute function public.audit_logs_enforce_actor();

-- ---------------------------------------------------------------- 4) auditoria automatica de companies
create or replace function public.audit_companies_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_changes jsonb;
begin
  select coalesce(jsonb_object_agg(n.key, jsonb_build_object('de', o.value, 'para', n.value)), '{}'::jsonb)
    into v_changes
    from jsonb_each(to_jsonb(new)) n
    join jsonb_each(to_jsonb(old)) o on o.key = n.key
   where n.value is distinct from o.value;

  if v_changes = '{}'::jsonb then
    return new;
  end if;

  insert into public.audit_logs (company_id, actor_id, action, entity, entity_id, metadata)
  values (
    new.id,
    auth.uid(),
    'company_updated',
    'companies',
    new.id::text,
    jsonb_build_object(
      'alteracoes', v_changes,
      'via', case when auth.uid() is null then 'plataforma' else 'usuario' end
    )
  );

  return new;
end;
$$;

revoke all on function public.audit_companies_changes() from public;

drop trigger if exists trg_companies_audit on public.companies;
create trigger trg_companies_audit
after update on public.companies
for each row execute function public.audit_companies_changes();

-- ---------------------------------------------------------------- conferencia (SQL Editor)
-- 1) Permissoes (esperado: companies/authenticated = SELECT; anon sem linhas; audit_logs/authenticated = INSERT, SELECT):
--    select table_name, grantee, privilege_type from information_schema.table_privileges
--    where table_schema = 'public' and table_name in ('companies','audit_logs')
--      and grantee in ('anon','authenticated') order by 1, 2, 3;
-- 2) Colunas atualizaveis pelo admin (esperado: cidade, email_contato, endereco, logo, nome, telefone, tema, uf):
--    select column_name from information_schema.column_privileges
--    where table_schema = 'public' and table_name = 'companies'
--      and grantee = 'authenticated' and privilege_type = 'UPDATE' order by 1;
-- 3) Registro automatico (altere o tema pelo app e rode):
--    select created_at, actor_id, metadata from public.audit_logs
--    where action = 'company_updated' order by created_at desc limit 3;
-- 4) Admin NAO muda o plano (esperado: ERRO "permission denied for table companies"/"column plan"):
--    begin;
--    select set_config('request.jwt.claims',
--      json_build_object('sub','<ID_DO_ADMIN>','role','authenticated')::text, true);
--    set local role authenticated;
--    update public.companies set plan = 'pro' where id = '<ID_DA_EMPRESA>';
--    rollback;
--
-- Desfazer (se algo do app deixar de funcionar; me avise o erro antes de reverter tudo):
--    drop trigger if exists trg_companies_audit on public.companies;
--    drop trigger if exists trg_audit_logs_enforce_actor on public.audit_logs;