-- Etapa 32: documento (CPF/CNPJ) da empresa - coluna, trava e auditoria mascarada
-- Execute no Supabase SQL Editor APOS 001..031. Seguro para reexecucao.
--
-- Regras:
--  1) O admin informa o documento UMA vez (ao aderir a um plano). Depois de preenchido,
--     so a plataforma altera (service role / modo suporte / SQL Editor / master).
--  2) O documento nunca aparece por extenso no registro de auditoria.
--  3) Aceita CPF (11 digitos) e CNPJ numerico ou alfanumerico (12 caracteres + 2 digitos verificadores).

alter table public.companies
  add column if not exists documento text;

alter table public.companies drop constraint if exists companies_documento_format;
alter table public.companies
  add constraint companies_documento_format check (
    documento is null
    or documento ~ '^[0-9]{11}$'
    or documento ~ '^[0-9A-Z]{12}[0-9]{2}$'
  );

grant update (documento) on public.companies to authenticated;

-- ---------------------------------------------------------------- trava
create or replace function public.guard_companies_documento()
returns trigger
language plpgsql
as $$
begin
  -- service role (modo suporte) e SQL Editor: sem usuario logado, nao restringe.
  if auth.uid() is null then
    return new;
  end if;

  if old.documento is not null
     and new.documento is distinct from old.documento
     and not public.is_platform_admin() then
    raise exception 'O documento da empresa so pode ser alterado pela plataforma.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_companies_guard_documento on public.companies;
create trigger trg_companies_guard_documento
before update on public.companies
for each row execute function public.guard_companies_documento();

-- ---------------------------------------------------------------- auditoria sem o numero por extenso
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

  -- Dado pessoal: registra apenas que foi definido/alterado, nunca o numero.
  if v_changes ? 'documento' then
    v_changes := jsonb_set(
      v_changes,
      '{documento}',
      jsonb_build_object(
        'de', case when old.documento is null then null else to_jsonb('***'::text) end,
        'para', case when new.documento is null then null else to_jsonb('***'::text) end
      )
    );
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

-- ---------------------------------------------------------------- limpeza opcional (SQL Editor)
-- Se alguem ja informou um documento antes deste script, o numero pode estar por extenso em registros antigos:
--   update public.audit_logs
--      set metadata = jsonb_set(metadata, '{alteracoes,documento}', '{"de":"***","para":"***"}'::jsonb)
--    where action = 'company_updated' and metadata->'alteracoes' ? 'documento';

-- ---------------------------------------------------------------- conferencia (SQL Editor)
-- 1) Coluna e permissao (esperado: 1 linha de coluna; 'documento' na lista de UPDATE):
--    select column_name, data_type from information_schema.columns
--    where table_schema = 'public' and table_name = 'companies' and column_name = 'documento';
--    select column_name from information_schema.column_privileges
--    where table_schema = 'public' and table_name = 'companies'
--      and grantee = 'authenticated' and privilege_type = 'UPDATE' order by 1;
-- 2) Trava (como admin de empresa que JA tem documento, esperado: ERRO "so pode ser alterado pela plataforma"):
--    begin;
--    select set_config('request.jwt.claims',
--      json_build_object('sub','<ID_DO_ADMIN>','role','authenticated')::text, true);
--    set local role authenticated;
--    update public.companies set documento = '12345678909' where id = '<ID_DA_EMPRESA>';
--    rollback;