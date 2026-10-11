-- Etapa 20: status da conta (trial / active / past_due / suspended / canceled)
-- Execute no Supabase SQL Editor APOS 001..019. Seguro para reexecucao.
-- Pode ser aplicado ANTES de publicar o app novo: o app antigo ignora as colunas novas.
--
-- Colunas novas em companies:
--   status          trial | active | past_due | suspended | canceled   (padrao: trial)
--   plan            texto livre curto (padrao: 'trial'; empresas existentes: 'cortesia')
--   trial_ends_at   fim do periodo de teste (padrao: agora + 14 dias)
--   suspended_at    quando entrou em suspensao (preenchido pela plataforma)
--   billing_exempt  cortesia: ignora vencimento de trial e avisos de pagamento
--
-- Regras garantidas no banco (nao dependem do app):
--   * Empresa NOVA criada por usuario logado (onboarding) SEMPRE nasce em trial, 14 dias, sem cortesia.
--     Mesmo que alguem tente inserir status 'active' direto pela API.
--   * Usuario logado (inclusive admin da empresa) NAO consegue alterar status, plano, trial,
--     suspensao nem cortesia. Somente a plataforma (service role / SQL Editor, auth.uid() nulo).
--   * Empresas que JA existem passam a 'active' + cortesia (somente na 1a execucao).
--
-- Para mudar a duracao do teste, altere "14 days" nos DOIS lugares: o DEFAULT da coluna e o gatilho.

-- ---------------------------------------------------------------- colunas + backfill (1a execucao)
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'companies'
      and column_name = 'status'
  ) then
    alter table public.companies
      add column status text not null default 'trial',
      add column plan text,
      add column trial_ends_at timestamptz,
      add column suspended_at timestamptz,
      add column billing_exempt boolean not null default false;

    -- Empresas existentes: acesso normal, sem trial e sem bloqueio.
    update public.companies
    set status = 'active',
        plan = 'cortesia',
        billing_exempt = true,
        trial_ends_at = null,
        suspended_at = null;
  end if;
end
$$;

-- ---------------------------------------------------------------- padroes para empresas NOVAS
alter table public.companies alter column status set default 'trial';
alter table public.companies alter column plan set default 'trial';
alter table public.companies alter column trial_ends_at set default (now() + interval '14 days');

-- ---------------------------------------------------------------- restricoes e indice
alter table public.companies drop constraint if exists companies_status_check;
alter table public.companies
  add constraint companies_status_check
  check (status in ('trial', 'active', 'past_due', 'suspended', 'canceled'));

alter table public.companies drop constraint if exists companies_plan_length;
alter table public.companies
  add constraint companies_plan_length
  check (plan is null or char_length(plan) <= 40);

create index if not exists idx_companies_status on public.companies (status);

-- ---------------------------------------------------------------- gatilho de guarda
create or replace function public.guard_companies_billing()
returns trigger
language plpgsql
as $$
begin
  -- service role (master/modo suporte) e SQL Editor: sem usuario logado, nao restringe.
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Quem cria empresa logado (onboarding) sempre comeca em teste, sem cortesia.
    new.status := 'trial';
    new.plan := 'trial';
    new.trial_ends_at := now() + interval '14 days';
    new.suspended_at := null;
    new.billing_exempt := false;
    return new;
  end if;

  if new.status is distinct from old.status
     or new.plan is distinct from old.plan
     or new.trial_ends_at is distinct from old.trial_ends_at
     or new.suspended_at is distinct from old.suspended_at
     or new.billing_exempt is distinct from old.billing_exempt then
    raise exception 'Somente a plataforma pode alterar o plano e o status da conta.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_companies_guard_billing on public.companies;
create trigger trg_companies_guard_billing
before insert or update on public.companies
for each row execute function public.guard_companies_billing();

-- ---------------------------------------------------------------- conferencia (SQL Editor)
-- 1) Empresas existentes devem estar ativas + cortesia:
--    select nome, status, plan, billing_exempt, trial_ends_at from public.companies order by created_at;
--
-- 2) Os dois objetos novos existem (esperado: 1 linha de gatilho e 5 colunas):
--    select tgname from pg_trigger where tgname = 'trg_companies_guard_billing';
--    select column_name from information_schema.columns
--    where table_schema = 'public' and table_name = 'companies'
--      and column_name in ('status','plan','trial_ends_at','suspended_at','billing_exempt');
--
-- 3) Admin da empresa NAO consegue se liberar (esperado: ERRO "Somente a plataforma pode alterar..."):
--    begin;
--    select set_config('request.jwt.claims',
--      json_build_object('sub','<ID_DO_ADMIN>','role','authenticated','email','<EMAIL_DO_ADMIN>')::text, true);
--    set local role authenticated;
--    update public.companies set status = 'active' where id = '<ID_DA_EMPRESA>';
--    rollback;
--
-- 4) Empresa criada por onboarding nasce em trial de 14 dias: crie uma conta nova, conclua o onboarding e rode
--    select nome, status, plan, trial_ends_at, billing_exempt from public.companies order by created_at desc limit 1;
--
-- 5) Plataforma altera livremente (SQL Editor, sem jwt) - ex.: simular teste vencido para validar o bloqueio:
--    update public.companies set trial_ends_at = now() - interval '1 day' where id = '<ID_DA_EMPRESA_DE_TESTE>';
--    (a empresa de teste precisa estar com status 'trial' e billing_exempt = false)