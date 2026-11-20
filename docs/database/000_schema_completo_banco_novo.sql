-- =====================================================================================
-- SCHEMA COMPLETO - saas-barbearias (banco novo)
-- Junta, na ordem, os scripts 001..023b + 024 + 025. Execute no Supabase SQL Editor em um projeto VAZIO.
-- Para um banco que ja existe, NAO rode este arquivo: rode so os scripts novos (ex.: 024).
-- Depois de rodar: crie o primeiro usuario pelo app e, para o acesso master, execute
--   insert into public.platform_admins (user_id) values ('SEU_USER_ID_AQUI');
-- Omitido de proposito: backfill de dados antigos do 017 (nao existe dado antigo em banco novo).
-- =====================================================================================

-- #####################################################################################
-- ## ORIGEM: 001_etapa3_schema_rls.sql
-- #####################################################################################
-- Etapa 3: Modelagem inicial com RLS multi-tenant
-- Execute no Supabase SQL Editor.

-- Extensao para UUID
create extension if not exists "pgcrypto";

-- Enumeracoes
create type public.user_role as enum ('admin', 'employee');
create type public.appointment_status as enum ('agendado', 'concluido', 'cancelado');

-- Tabela de empresas
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  logo text,
  cor_primaria text default '#000000',
  cor_secundaria text default '#D4AF37',
  telefone text,
  endereco text,
  created_at timestamptz not null default now()
);

-- Perfis (1 para 1 com auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete restrict,
  nome text not null,
  email text not null,
  role public.user_role not null default 'employee',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_unique unique (email),
  constraint profiles_email_lower check (email = lower(email))
);

-- Funcao helper para obter a empresa do usuario logado
create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.company_id
  from public.profiles as p
  where p.id = auth.uid()
  limit 1;
$$;

revoke all on function public.current_company_id() from public;
grant execute on function public.current_company_id() to authenticated;

-- Funcionarios
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  nome text not null,
  telefone text,
  percentual_comissao numeric(5,2) not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employees_percentual_comissao_range check (
    percentual_comissao >= 0 and percentual_comissao <= 100
  ),
  constraint employees_id_company_unique unique (id, company_id)
);

-- Servicos
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  nome text not null,
  duracao integer not null,
  valor numeric(10,2) not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_duracao_positive check (duracao > 0),
  constraint services_valor_positive check (valor >= 0),
  constraint services_id_company_unique unique (id, company_id)
);

-- Agendamentos
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  cliente_nome text not null,
  cliente_telefone text,
  employee_id uuid not null,
  service_id uuid not null,
  data_hora timestamptz not null,
  status public.appointment_status not null default 'agendado',
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_id_company_unique unique (id, company_id),
  constraint appointments_employee_company_fk
    foreign key (employee_id, company_id)
    references public.employees (id, company_id)
    on delete restrict,
  constraint appointments_service_company_fk
    foreign key (service_id, company_id)
    references public.services (id, company_id)
    on delete restrict
);

-- Financeiro
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  appointment_id uuid not null,
  valor numeric(10,2) not null,
  forma_pagamento text not null,
  percentual_comissao numeric(5,2) not null,
  valor_comissao numeric(10,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_appointment_unique unique (appointment_id),
  constraint payments_valor_positive check (valor >= 0),
  constraint payments_percentual_comissao_range check (
    percentual_comissao >= 0 and percentual_comissao <= 100
  ),
  constraint payments_valor_comissao_positive check (valor_comissao >= 0),
  constraint payments_appointment_company_fk
    foreign key (appointment_id, company_id)
    references public.appointments (id, company_id)
    on delete cascade
);

-- Indices principais
create index if not exists idx_profiles_company_id on public.profiles (company_id);
create index if not exists idx_employees_company_id on public.employees (company_id);
create index if not exists idx_services_company_id on public.services (company_id);
create index if not exists idx_appointments_company_id on public.appointments (company_id);
create index if not exists idx_appointments_data_hora on public.appointments (data_hora);
create index if not exists idx_payments_company_id on public.payments (company_id);
create index if not exists idx_payments_created_at on public.payments (created_at);

-- Trigger generico para updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Recria triggers de updated_at para evitar duplicidade

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists trg_employees_updated_at on public.employees;
create trigger trg_employees_updated_at
before update on public.employees
for each row
execute function public.set_updated_at();

drop trigger if exists trg_services_updated_at on public.services;
create trigger trg_services_updated_at
before update on public.services
for each row
execute function public.set_updated_at();

drop trigger if exists trg_appointments_updated_at on public.appointments;
create trigger trg_appointments_updated_at
before update on public.appointments
for each row
execute function public.set_updated_at();

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at
before update on public.payments
for each row
execute function public.set_updated_at();

-- Habilita RLS
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.payments enable row level security;

-- Remove politicas antigas (seguro para reexecucao)
drop policy if exists companies_select_own on public.companies;
drop policy if exists companies_insert_authenticated on public.companies;
drop policy if exists companies_update_admin on public.companies;

drop policy if exists profiles_select_own_company on public.profiles;
drop policy if exists profiles_insert_self_bootstrap on public.profiles;
drop policy if exists profiles_insert_admin_same_company on public.profiles;
drop policy if exists profiles_update_own_or_admin_same_company on public.profiles;

drop policy if exists employees_crud_same_company on public.employees;
drop policy if exists services_crud_same_company on public.services;
drop policy if exists appointments_crud_same_company on public.appointments;
drop policy if exists payments_crud_same_company on public.payments;

-- Policies: companies
create policy companies_select_own
on public.companies
for select
to authenticated
using (id = public.current_company_id());

create policy companies_insert_authenticated
on public.companies
for insert
to authenticated
with check (true);

create policy companies_update_admin
on public.companies
for update
to authenticated
using (
  id = public.current_company_id()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = public.current_company_id()
      and p.role = 'admin'
  )
)
with check (id = public.current_company_id());

-- Policies: profiles
create policy profiles_select_own_company
on public.profiles
for select
to authenticated
using (company_id = public.current_company_id());

create policy profiles_insert_self_bootstrap
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  and email = lower(email)
);

create policy profiles_insert_admin_same_company
on public.profiles
for insert
to authenticated
with check (
  company_id = public.current_company_id()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = public.current_company_id()
      and p.role = 'admin'
  )
);

create policy profiles_update_own_or_admin_same_company
on public.profiles
for update
to authenticated
using (
  company_id = public.current_company_id()
  and (
    id = auth.uid()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.company_id = public.current_company_id()
        and p.role = 'admin'
    )
  )
)
with check (company_id = public.current_company_id());

-- Policies: employees
create policy employees_crud_same_company
on public.employees
for all
to authenticated
using (company_id = public.current_company_id())
with check (company_id = public.current_company_id());

-- Policies: services
create policy services_crud_same_company
on public.services
for all
to authenticated
using (company_id = public.current_company_id())
with check (company_id = public.current_company_id());

-- Policies: appointments
create policy appointments_crud_same_company
on public.appointments
for all
to authenticated
using (company_id = public.current_company_id())
with check (company_id = public.current_company_id());

-- Policies: payments
create policy payments_crud_same_company
on public.payments
for all
to authenticated
using (company_id = public.current_company_id())
with check (company_id = public.current_company_id());

-- #####################################################################################
-- ## ORIGEM: 002_etapa6_conflito_agendamentos.sql
-- #####################################################################################
-- Etapa 6 - Reforco de conflitos de horario em agendamentos
-- Execute no Supabase SQL Editor apos a Etapa 3.

create extension if not exists btree_gist;

alter table public.appointments
add column if not exists data_hora_fim timestamptz;

-- Backfill para dados existentes usando a duracao do servico.
update public.appointments as a
set data_hora_fim = a.data_hora + make_interval(mins => s.duracao)
from public.services as s
where a.service_id = s.id
  and a.company_id = s.company_id
  and a.data_hora_fim is null;

-- Fallback defensivo para evitar nulos em dados legados inconsistentes.
update public.appointments
set data_hora_fim = data_hora + interval '30 minutes'
where data_hora_fim is null;

alter table public.appointments
alter column data_hora_fim set not null;

alter table public.appointments
drop constraint if exists appointments_data_hora_fim_after_start;

alter table public.appointments
add constraint appointments_data_hora_fim_after_start
check (data_hora_fim > data_hora);

create index if not exists idx_appointments_employee_status_start
on public.appointments (company_id, employee_id, status, data_hora);

create index if not exists idx_appointments_employee_status_end
on public.appointments (company_id, employee_id, status, data_hora_fim);

-- Regra de conflito no banco (backend principal):
-- novo_inicio < existente_fim AND novo_fim > existente_inicio
-- Aplicada apenas para status 'agendado'.
alter table public.appointments
drop constraint if exists appointments_no_overlap_per_employee;

alter table public.appointments
add constraint appointments_no_overlap_per_employee
exclude using gist (
  company_id with =,
  employee_id with =,
  tstzrange(data_hora, data_hora_fim, '[)') with &&
)
where (status = 'agendado');

-- #####################################################################################
-- ## ORIGEM: 003_etapa11_convites_auditoria.sql
-- #####################################################################################
-- Etapa 11 - Convites da equipe e trilha de auditoria
-- Execute no Supabase SQL Editor apos a Etapa 3.

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'invite_status'
      and n.nspname = 'public'
  ) then
    create type public.invite_status as enum ('pending', 'accepted', 'revoked', 'expired');
  end if;
end
$$;

create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role public.user_role not null default 'employee',
  status public.invite_status not null default 'pending',
  token text not null,
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_invites_email_lower check (email = lower(email)),
  constraint team_invites_token_unique unique (token)
);

create index if not exists idx_team_invites_company_id on public.team_invites(company_id);
create index if not exists idx_team_invites_status on public.team_invites(status);
create index if not exists idx_team_invites_expires_at on public.team_invites(expires_at);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_company_created_at on public.audit_logs(company_id, created_at desc);
create index if not exists idx_audit_logs_action on public.audit_logs(action);

drop trigger if exists trg_team_invites_updated_at on public.team_invites;
create trigger trg_team_invites_updated_at
before update on public.team_invites
for each row
execute function public.set_updated_at();

alter table public.team_invites enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists team_invites_select_same_company on public.team_invites;
drop policy if exists team_invites_insert_admin_same_company on public.team_invites;
drop policy if exists team_invites_update_admin_same_company on public.team_invites;
drop policy if exists team_invites_delete_admin_same_company on public.team_invites;
drop policy if exists team_invites_select_invited_email on public.team_invites;
drop policy if exists team_invites_update_invited_accept on public.team_invites;

drop policy if exists audit_logs_select_same_company on public.audit_logs;
drop policy if exists audit_logs_insert_same_company on public.audit_logs;

create policy team_invites_select_same_company
on public.team_invites
for select
to authenticated
using (company_id = public.current_company_id());

create policy team_invites_select_invited_email
on public.team_invites
for select
to authenticated
using (
  email = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create policy team_invites_insert_admin_same_company
on public.team_invites
for insert
to authenticated
with check (
  company_id = public.current_company_id()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = public.current_company_id()
      and p.role = 'admin'
  )
);

create policy team_invites_update_admin_same_company
on public.team_invites
for update
to authenticated
using (
  company_id = public.current_company_id()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = public.current_company_id()
      and p.role = 'admin'
  )
)
with check (company_id = public.current_company_id());

create policy team_invites_update_invited_accept
on public.team_invites
for update
to authenticated
using (
  status = 'pending'
  and email = lower(coalesce(auth.jwt() ->> 'email', ''))
)
with check (
  email = lower(coalesce(auth.jwt() ->> 'email', ''))
  and status in ('accepted', 'expired')
  and accepted_by = auth.uid()
);

create policy team_invites_delete_admin_same_company
on public.team_invites
for delete
to authenticated
using (
  company_id = public.current_company_id()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = public.current_company_id()
      and p.role = 'admin'
  )
);

create policy audit_logs_select_same_company
on public.audit_logs
for select
to authenticated
using (company_id = public.current_company_id());

create policy audit_logs_insert_same_company
on public.audit_logs
for insert
to authenticated
with check (company_id = public.current_company_id());

-- #####################################################################################
-- ## ORIGEM: 004_etapa12_notificacoes.sql
-- #####################################################################################
-- Etapa 12 - Automacoes de notificacao para eventos sensiveis
-- Execute no Supabase SQL Editor apos a Etapa 11.

create table if not exists public.security_notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_key text not null,
  title text not null,
  message text not null,
  severity text not null default 'warning',
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint security_notifications_severity_check check (severity in ('info', 'warning', 'critical'))
);

create index if not exists idx_security_notifications_company_created
  on public.security_notifications(company_id, created_at desc);
create index if not exists idx_security_notifications_recipient_read
  on public.security_notifications(recipient_id, read_at);
create index if not exists idx_security_notifications_event_key
  on public.security_notifications(event_key);

alter table public.security_notifications enable row level security;

drop policy if exists security_notifications_select_recipient on public.security_notifications;
drop policy if exists security_notifications_insert_admin_same_company on public.security_notifications;
drop policy if exists security_notifications_update_recipient on public.security_notifications;

create policy security_notifications_select_recipient
on public.security_notifications
for select
to authenticated
using (
  company_id = public.current_company_id()
  and recipient_id = auth.uid()
);

create policy security_notifications_insert_admin_same_company
on public.security_notifications
for insert
to authenticated
with check (
  company_id = public.current_company_id()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = public.current_company_id()
      and p.role = 'admin'
  )
);

create policy security_notifications_update_recipient
on public.security_notifications
for update
to authenticated
using (
  company_id = public.current_company_id()
  and recipient_id = auth.uid()
)
with check (
  company_id = public.current_company_id()
  and recipient_id = auth.uid()
);

-- #####################################################################################
-- ## ORIGEM: 005_etapa13_clientes.sql
-- #####################################################################################
-- Etapa 13 - Cadastro de clientes (primeiro bloco)
-- Execute no Supabase SQL Editor apos a Etapa 3.

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  nome text not null,
  telefone text,
  email text,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_nome_min_length check (char_length(trim(nome)) >= 2)
);

create index if not exists idx_customers_company_created_at
  on public.customers(company_id, created_at desc);
create index if not exists idx_customers_company_nome
  on public.customers(company_id, nome);

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at
before update on public.customers
for each row
execute function public.set_updated_at();

alter table public.customers enable row level security;

drop policy if exists customers_select_same_company on public.customers;
drop policy if exists customers_insert_admin_same_company on public.customers;
drop policy if exists customers_update_admin_same_company on public.customers;
drop policy if exists customers_delete_admin_same_company on public.customers;

create policy customers_select_same_company
on public.customers
for select
to authenticated
using (company_id = public.current_company_id());

create policy customers_insert_admin_same_company
on public.customers
for insert
to authenticated
with check (
  company_id = public.current_company_id()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = public.current_company_id()
      and p.role = 'admin'
  )
);

create policy customers_update_admin_same_company
on public.customers
for update
to authenticated
using (
  company_id = public.current_company_id()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = public.current_company_id()
      and p.role = 'admin'
  )
)
with check (company_id = public.current_company_id());

create policy customers_delete_admin_same_company
on public.customers
for delete
to authenticated
using (
  company_id = public.current_company_id()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = public.current_company_id()
      and p.role = 'admin'
  )
);

-- #####################################################################################
-- ## ORIGEM: 006_etapa13_agendamentos_clientes.sql
-- #####################################################################################
-- Etapa 13 - Integracao de clientes em agendamentos
-- Execute no Supabase SQL Editor apos 001, 002 e 005.

alter table public.customers
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'customers_id_company_unique'
      and conrelid = 'public.customers'::regclass
  ) then
    alter table public.customers
      add constraint customers_id_company_unique unique (id, company_id);
  end if;
end
$$;

alter table public.appointments
  add column if not exists customer_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_customer_company_fk'
      and conrelid = 'public.appointments'::regclass
  ) then
    alter table public.appointments
      add constraint appointments_customer_company_fk
      foreign key (customer_id, company_id)
      references public.customers (id, company_id)
      on delete set null;
  end if;
end
$$;

create index if not exists idx_appointments_customer_id
  on public.appointments (customer_id);

-- #####################################################################################
-- ## ORIGEM: 009_etapa16_master_plataforma.sql
-- #####################################################################################
-- Etapa 16: Acesso master da plataforma (visao global)

create table if not exists public.platform_admins (
  user_id uuid primary key,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.platform_admins is 'Usuarios master com acesso global de plataforma.';

alter table public.platform_admins enable row level security;

drop policy if exists platform_admins_select_self on public.platform_admins;
create policy platform_admins_select_self
on public.platform_admins
for select
to authenticated
using (user_id = auth.uid());

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  );
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

drop policy if exists companies_select_platform_admin on public.companies;
create policy companies_select_platform_admin
on public.companies
for select
to authenticated
using (public.is_platform_admin());

-- Uso inicial:
-- insert into public.platform_admins (user_id) values ('SEU_USER_ID_AQUI');

-- #####################################################################################
-- ## ORIGEM: 010_fix_grants_authenticated.sql
-- #####################################################################################
-- Correcao: privilegios (GRANT) ausentes para o role authenticated
-- Execute no Supabase SQL Editor apos as etapas 001 a 009.
--
-- Contexto do problema:
-- Ao criar as tabelas manualmente pelo SQL Editor (executado como "postgres"),
-- os privilegios padrao que o Supabase normalmente concede a "authenticated"/"anon"
-- (configurados via ALTER DEFAULT PRIVILEGES para o role "supabase_admin") nao sao
-- herdados automaticamente. O RLS (Row Level Security) so restringe QUAIS linhas
-- um role pode ver/alterar; ele nao concede acesso à tabela em si. Sem o GRANT
-- basico na tabela, qualquer operacao falha com "permission denied for table X",
-- mesmo com as policies corretas.
--
-- Este script concede os privilegios minimos necessarios para o funcionamento
-- das policies ja criadas nos scripts anteriores. Seguro para reexecucao.

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.companies to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.employees to authenticated;
grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.appointments to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select, insert, update, delete on public.team_invites to authenticated;
grant select, insert, update, delete on public.audit_logs to authenticated;
grant select, insert, update, delete on public.security_notifications to authenticated;
grant select, insert, update, delete on public.customers to authenticated;
grant select on public.platform_admins to authenticated;

-- #####################################################################################
-- ## ORIGEM: 012_etapa_comissao_opcional.sql
-- #####################################################################################
-- Etapa: tornar percentual de comissao opcional para funcionarios
-- Execute no Supabase SQL Editor apos a etapa 011 (010_fix_grants_authenticated.sql).
--
-- Contexto: o cadastro de funcionario passou a permitir salvar sem definir
-- o percentual de comissao (ex.: administrador que atua como atendente unico
-- e ainda nao decidiu a comissao). A coluna era NOT NULL, o que bloqueava
-- o insert com valor nulo.

alter table public.employees
  alter column percentual_comissao drop not null,
  alter column percentual_comissao drop default;

-- #####################################################################################
-- ## ORIGEM: 013_etapa_funcionario_admin.sql
-- #####################################################################################
-- Etapa: vincular funcionario ao usuario administrador (auto-cadastro)
-- Execute no Supabase SQL Editor apos a etapa 012.
--
-- Contexto: para detectar se o administrador logado ja possui um registro
-- de funcionario (e permitir o botao "Cadastrar-me como funcionario" na tela
-- de Funcionarios), o registro precisa ficar vinculado ao auth.users. O
-- e-mail tambem passa a ser copiado do perfil quando o auto-cadastro e usado.

alter table public.employees
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists email text;

-- Garante no maximo um registro de funcionario por usuario dentro da mesma empresa
create unique index if not exists idx_employees_company_user_unique
  on public.employees (company_id, user_id)
  where user_id is not null;

-- #####################################################################################
-- ## ORIGEM: 014_etapa_almoxarifado_estoque.sql
-- #####################################################################################
-- Etapa 14: Almoxarifado (estoque de produtos do salao)
-- Execute no Supabase SQL Editor APOS 001..013.
-- Seguro para reexecucao.
--
-- Modelo:
--   products         -> cadastro do produto + saldo atual (mantido SOMENTE por trigger)
--   stock_movements  -> livro-razao de entradas/saidas (imutavel: sem UPDATE/DELETE)
-- Regras garantidas no banco:
--   * saldo nunca fica negativo
--   * custo medio ponderado recalculado a cada entrada
--   * saida grava o custo medio da hora (snapshot) -> valor consumido fica correto no historico
--   * apenas admin da empresa le/escreve (RLS)
--   * app nao consegue editar quantidade_atual/custo_medio direto (GRANT por coluna)

-- ---------------------------------------------------------------- tipos
do $$
begin
  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'stock_movement_type' and n.nspname = 'public'
  ) then
    create type public.stock_movement_type as enum ('entrada', 'saida');
  end if;

  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'stock_movement_reason' and n.nspname = 'public'
  ) then
    create type public.stock_movement_reason as enum
      ('compra', 'devolucao', 'ajuste', 'uso_interno', 'venda', 'perda');
  end if;
end
$$;

-- ---------------------------------------------------------------- helper
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

-- ---------------------------------------------------------------- products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  nome text not null,
  categoria text,
  sku text,
  unidade text not null default 'un',
  estoque_minimo numeric(12,3) not null default 0,
  quantidade_atual numeric(12,3) not null default 0,
  custo_medio numeric(12,4) not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_nome_min_length check (char_length(trim(nome)) >= 2),
  constraint products_unidade_check check (unidade in ('un', 'ml', 'l', 'g', 'kg')),
  constraint products_estoque_minimo_nonneg check (estoque_minimo >= 0),
  constraint products_quantidade_nonneg check (quantidade_atual >= 0),
  constraint products_custo_medio_nonneg check (custo_medio >= 0),
  constraint products_id_company_unique unique (id, company_id)
);

create unique index if not exists idx_products_company_nome_unique
  on public.products (company_id, lower(trim(nome)));
create index if not exists idx_products_company_ativo
  on public.products (company_id, ativo);

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- stock_movements
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  product_id uuid not null,
  tipo public.stock_movement_type not null,
  motivo public.stock_movement_reason not null,
  quantidade numeric(12,3) not null,
  custo_unitario numeric(12,4) not null default 0,
  custo_total numeric(12,2) generated always as (round(quantidade * custo_unitario, 2)) stored,
  observacao text,
  data_movimento timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint stock_movements_quantidade_positive check (quantidade > 0),
  constraint stock_movements_custo_nonneg check (custo_unitario >= 0),
  constraint stock_movements_tipo_motivo check (
    (tipo = 'entrada' and motivo in ('compra', 'devolucao', 'ajuste'))
    or (tipo = 'saida' and motivo in ('uso_interno', 'venda', 'perda', 'ajuste'))
  ),
  constraint stock_movements_product_company_fk
    foreign key (product_id, company_id)
    references public.products (id, company_id)
    on delete restrict
);

create index if not exists idx_stock_movements_company_data
  on public.stock_movements (company_id, data_movimento desc);
create index if not exists idx_stock_movements_product_data
  on public.stock_movements (product_id, data_movimento desc);

-- ---------------------------------------------------------------- trigger de saldo
create or replace function public.apply_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qtd numeric(12,3);
  v_custo numeric(12,4);
  v_nova_qtd numeric(12,3);
  v_novo_custo numeric(12,4);
begin
  -- trava a linha do produto: evita corrida entre duas movimentacoes simultaneas
  select p.quantidade_atual, p.custo_medio
    into v_qtd, v_custo
  from public.products p
  where p.id = new.product_id
    and p.company_id = new.company_id
  for update;

  if not found then
    raise exception 'Produto nao encontrado para esta empresa.';
  end if;

  if new.tipo = 'entrada' then
    -- devolucao/ajuste sem custo informado entram ao custo medio atual
    if new.motivo <> 'compra' and new.custo_unitario = 0 then
      new.custo_unitario := v_custo;
    end if;

    v_nova_qtd := v_qtd + new.quantidade;
    v_novo_custo := round(
      (v_qtd * v_custo + new.quantidade * new.custo_unitario) / v_nova_qtd,
      4
    );
  else
    if v_qtd < new.quantidade then
      raise exception 'Estoque insuficiente. Disponivel: %', v_qtd;
    end if;

    -- snapshot: o custo da saida e sempre o custo medio no momento
    new.custo_unitario := v_custo;
    v_nova_qtd := v_qtd - new.quantidade;
    v_novo_custo := v_custo;
  end if;

  update public.products
  set quantidade_atual = v_nova_qtd,
      custo_medio = v_novo_custo
  where id = new.product_id
    and company_id = new.company_id;

  return new;
end;
$$;

drop trigger if exists trg_stock_movements_apply on public.stock_movements;
create trigger trg_stock_movements_apply
before insert on public.stock_movements
for each row execute function public.apply_stock_movement();

-- ---------------------------------------------------------------- RLS
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;

drop policy if exists products_select_admin on public.products;
drop policy if exists products_insert_admin on public.products;
drop policy if exists products_update_admin on public.products;
drop policy if exists products_delete_admin on public.products;
drop policy if exists stock_movements_select_admin on public.stock_movements;
drop policy if exists stock_movements_insert_admin on public.stock_movements;

create policy products_select_admin on public.products
for select to authenticated
using (company_id = public.current_company_id() and public.is_company_admin());

create policy products_insert_admin on public.products
for insert to authenticated
with check (company_id = public.current_company_id() and public.is_company_admin());

create policy products_update_admin on public.products
for update to authenticated
using (company_id = public.current_company_id() and public.is_company_admin())
with check (company_id = public.current_company_id());

create policy products_delete_admin on public.products
for delete to authenticated
using (company_id = public.current_company_id() and public.is_company_admin());

create policy stock_movements_select_admin on public.stock_movements
for select to authenticated
using (company_id = public.current_company_id() and public.is_company_admin());

create policy stock_movements_insert_admin on public.stock_movements
for insert to authenticated
with check (
  company_id = public.current_company_id()
  and public.is_company_admin()
  and created_by = auth.uid()
);
-- Sem policy de UPDATE/DELETE em stock_movements: historico imutavel.
-- Correcao de erro = novo movimento contrario (motivo 'ajuste').

-- ---------------------------------------------------------------- GRANTs
-- products: o app nunca grava quantidade_atual / custo_medio (so o trigger).
revoke all on public.products from authenticated;
grant select, delete on public.products to authenticated;
grant insert (company_id, nome, categoria, sku, unidade, estoque_minimo, ativo)
  on public.products to authenticated;
grant update (nome, categoria, sku, unidade, estoque_minimo, ativo)
  on public.products to authenticated;

revoke all on public.stock_movements from authenticated;
grant select, insert on public.stock_movements to authenticated;

-- ---------------------------------------------------------------- teste rapido (opcional)
-- Rode logado como admin (ou no SQL Editor trocando auth.uid() por um user_id valido):
--   insert into products (company_id, nome, unidade) values ('<COMPANY_ID>', 'Pomada modeladora', 'un');
--   insert into stock_movements (company_id, product_id, tipo, motivo, quantidade, custo_unitario)
--     values ('<COMPANY_ID>', '<PRODUCT_ID>', 'entrada', 'compra', 10, 25.00);
--   insert into stock_movements (company_id, product_id, tipo, motivo, quantidade)
--     values ('<COMPANY_ID>', '<PRODUCT_ID>', 'saida', 'uso_interno', 3);
--   select nome, quantidade_atual, custo_medio from products;   -- esperado: 7 | 25.0000
--   -- saida de 8 deve falhar com "Estoque insuficiente".

-- #####################################################################################
-- ## ORIGEM: 015_etapa_hardening_permissoes.sql
-- #####################################################################################
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

-- #####################################################################################
-- ## ORIGEM: 016_etapa_caixa_saldo_lancamentos.sql
-- #####################################################################################
-- Etapa 16: caixa (saldo inicial + lancamentos avulsos) e resumo financeiro calculado no banco
-- Execute no Supabase SQL Editor APOS 001..015 (precisa das tabelas payments e stock_movements - etapa 14).
-- Seguro para reexecucao.
--
-- Modelo:
--   cash_entries  -> lancamentos de caixa por empresa, em 3 tipos:
--       saldo_inicial : no maximo UM por empresa; valor pode ser negativo; vale "no inicio do dia" da data informada
--       entrada       : dinheiro que entrou fora de atendimentos (valor > 0)
--       despesa       : aluguel, luz, retirada etc. (valor > 0)
--   finance_summary(company, inicio, fim) -> uma linha com todos os totais do periodo
--
-- Regra do saldo (anterior + movimentos = final):
--   * Sem saldo inicial: saldo anterior = tudo que aconteceu antes do periodo.
--   * Com saldo inicial na data D: so contam movimentos a partir de D (o que veio antes ja esta dentro do saldo informado).
--   * saldo_final = saldo_anterior + saldo_inicial_no_periodo + receitas + entradas_avulsas
--                   - comissoes - compras_estoque - despesas
--   * consumo_estoque e informativo (nao entra no saldo).
-- Datas de pagamentos e de movimentos de estoque sao convertidas para America/Sao_Paulo DENTRO do banco,
-- entao o resultado nao depende do fuso do servidor.
-- So administradores da empresa leem/escrevem. Service role (modo suporte) continua livre.

-- ---------------------------------------------------------------- tipo
do $$
begin
  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'cash_entry_type' and n.nspname = 'public'
  ) then
    create type public.cash_entry_type as enum ('saldo_inicial', 'entrada', 'despesa');
  end if;
end
$$;

-- ---------------------------------------------------------------- helper
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

-- ---------------------------------------------------------------- cash_entries
create table if not exists public.cash_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tipo public.cash_entry_type not null,
  valor numeric(12,2) not null,
  categoria text,
  descricao text,
  data_lancamento date not null,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cash_entries_valor_check check (tipo = 'saldo_inicial' or valor > 0),
  constraint cash_entries_categoria_len check (categoria is null or char_length(categoria) <= 60),
  constraint cash_entries_descricao_len check (descricao is null or char_length(descricao) <= 200),
  constraint cash_entries_descricao_required check (
    tipo = 'saldo_inicial' or char_length(trim(coalesce(descricao, ''))) >= 2
  ),
  constraint cash_entries_data_min check (data_lancamento >= date '2020-01-01')
);

create index if not exists idx_cash_entries_company_data
  on public.cash_entries (company_id, data_lancamento desc);

-- No maximo um saldo inicial por empresa.
create unique index if not exists idx_cash_entries_one_opening_balance
  on public.cash_entries (company_id)
  where tipo = 'saldo_inicial';

drop trigger if exists trg_cash_entries_updated_at on public.cash_entries;
create trigger trg_cash_entries_updated_at
before update on public.cash_entries
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- RLS
alter table public.cash_entries enable row level security;

drop policy if exists cash_entries_select_admin on public.cash_entries;
drop policy if exists cash_entries_insert_admin on public.cash_entries;
drop policy if exists cash_entries_update_admin on public.cash_entries;
drop policy if exists cash_entries_delete_admin on public.cash_entries;

create policy cash_entries_select_admin on public.cash_entries
for select to authenticated
using (company_id = public.current_company_id() and public.is_company_admin());

create policy cash_entries_insert_admin on public.cash_entries
for insert to authenticated
with check (
  company_id = public.current_company_id()
  and public.is_company_admin()
  and (created_by is null or created_by = auth.uid())
);

create policy cash_entries_update_admin on public.cash_entries
for update to authenticated
using (company_id = public.current_company_id() and public.is_company_admin())
with check (company_id = public.current_company_id());

create policy cash_entries_delete_admin on public.cash_entries
for delete to authenticated
using (company_id = public.current_company_id() and public.is_company_admin());

-- ---------------------------------------------------------------- GRANTs
-- tipo e company_id nao podem ser alterados depois de criados.
-- created_by precisa estar no INSERT: o app grava o usuario explicitamente (e a policy exige created_by = auth.uid()).
revoke all on public.cash_entries from authenticated;
grant select, delete on public.cash_entries to authenticated;
grant insert (company_id, tipo, valor, categoria, descricao, data_lancamento, created_by)
  on public.cash_entries to authenticated;
grant update (valor, categoria, descricao, data_lancamento)
  on public.cash_entries to authenticated;

-- ---------------------------------------------------------------- finance_summary
create or replace function public.finance_summary(
  p_company_id uuid,
  p_start date,
  p_end date
)
returns table (
  saldo_inicial_valor numeric,
  saldo_inicial_data date,
  saldo_anterior numeric,
  saldo_inicial_no_periodo numeric,
  receitas numeric,
  comissoes numeric,
  compras_estoque numeric,
  entradas_avulsas numeric,
  despesas numeric,
  consumo_estoque numeric,
  saldo_final numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz constant text := 'America/Sao_Paulo';
  v_base_valor numeric := 0;
  v_base_data date;
  v_ref date;
  v_from date;
  v_ant_net numeric := 0;
  v_receitas numeric := 0;
  v_comissoes numeric := 0;
  v_compras numeric := 0;
  v_entradas numeric := 0;
  v_despesas numeric := 0;
  v_consumo numeric := 0;
  v_saldo_anterior numeric := 0;
  v_ini_periodo numeric := 0;
begin
  if p_company_id is null or p_start is null or p_end is null or p_end < p_start then
    raise exception 'Periodo invalido.';
  end if;

  -- Usuario logado: so a propria empresa e so admin. Service role (auth.uid() nulo): livre.
  if auth.uid() is not null then
    if p_company_id is distinct from public.current_company_id()
       or not public.is_company_admin() then
      raise exception 'Acesso negado.';
    end if;
  end if;

  select ce.valor, ce.data_lancamento
    into v_base_valor, v_base_data
  from public.cash_entries ce
  where ce.company_id = p_company_id
    and ce.tipo = 'saldo_inicial'
  limit 1;

  v_base_valor := coalesce(v_base_valor, 0);
  v_ref := coalesce(v_base_data, date '1900-01-01');
  v_from := greatest(p_start, v_ref);

  with ev as (
    select (p.created_at at time zone v_tz)::date as d, 'receita'::text as k, p.valor::numeric as v
      from public.payments p
      where p.company_id = p_company_id
    union all
    select (p.created_at at time zone v_tz)::date, 'comissao'::text, p.valor_comissao::numeric
      from public.payments p
      where p.company_id = p_company_id
    union all
    select (m.data_movimento at time zone v_tz)::date, 'compra'::text, m.custo_total::numeric
      from public.stock_movements m
      where m.company_id = p_company_id and m.tipo = 'entrada' and m.motivo = 'compra'
    union all
    select (m.data_movimento at time zone v_tz)::date, 'consumo'::text, m.custo_total::numeric
      from public.stock_movements m
      where m.company_id = p_company_id and m.tipo = 'saida'
    union all
    select ce.data_lancamento, 'entrada_avulsa'::text, ce.valor::numeric
      from public.cash_entries ce
      where ce.company_id = p_company_id and ce.tipo = 'entrada'
    union all
    select ce.data_lancamento, 'despesa'::text, ce.valor::numeric
      from public.cash_entries ce
      where ce.company_id = p_company_id and ce.tipo = 'despesa'
  )
  select
    coalesce(sum(
      case when ev.d >= v_ref and ev.d < p_start then
        case ev.k
          when 'receita' then ev.v
          when 'entrada_avulsa' then ev.v
          when 'comissao' then -ev.v
          when 'compra' then -ev.v
          when 'despesa' then -ev.v
          else 0
        end
      end
    ), 0),
    coalesce(sum(ev.v) filter (where ev.k = 'receita' and ev.d between v_from and p_end), 0),
    coalesce(sum(ev.v) filter (where ev.k = 'comissao' and ev.d between v_from and p_end), 0),
    coalesce(sum(ev.v) filter (where ev.k = 'compra' and ev.d between v_from and p_end), 0),
    coalesce(sum(ev.v) filter (where ev.k = 'entrada_avulsa' and ev.d between v_from and p_end), 0),
    coalesce(sum(ev.v) filter (where ev.k = 'despesa' and ev.d between v_from and p_end), 0),
    coalesce(sum(ev.v) filter (where ev.k = 'consumo' and ev.d between v_from and p_end), 0)
  into v_ant_net, v_receitas, v_comissoes, v_compras, v_entradas, v_despesas, v_consumo
  from ev;

  if v_base_data is not null and v_base_data < p_start then
    v_saldo_anterior := v_base_valor + v_ant_net;
  else
    v_saldo_anterior := v_ant_net;
  end if;

  if v_base_data is not null and v_base_data between p_start and p_end then
    v_ini_periodo := v_base_valor;
  else
    v_ini_periodo := 0;
  end if;

  return query
  select
    case when v_base_data is null then null::numeric else round(v_base_valor, 2) end,
    v_base_data,
    round(v_saldo_anterior, 2),
    round(v_ini_periodo, 2),
    round(v_receitas, 2),
    round(v_comissoes, 2),
    round(v_compras, 2),
    round(v_entradas, 2),
    round(v_despesas, 2),
    round(v_consumo, 2),
    round(
      v_saldo_anterior + v_ini_periodo + v_receitas - v_comissoes - v_compras + v_entradas - v_despesas,
      2
    );
end;
$$;

revoke all on function public.finance_summary(uuid, date, date) from public;
revoke all on function public.finance_summary(uuid, date, date) from anon;
grant execute on function public.finance_summary(uuid, date, date) to authenticated, service_role;

-- ---------------------------------------------------------------- testes (SQL Editor; troque <COMPANY_ID>)
-- No SQL Editor auth.uid() e nulo, entao a funcao roda livre. Os inserts abaixo usam created_by nulo.
--
-- 1) Sem nenhum saldo inicial: resultado = soma de tudo que ja aconteceu.
--    select * from public.finance_summary('<COMPANY_ID>', date '2026-10-01', date '2026-10-31');
--
-- 2) Saldo inicial de 1000 em 05/10, entrada avulsa 200 em 06/10, despesa 150 em 07/10:
--    insert into public.cash_entries (company_id, tipo, valor, data_lancamento)
--      values ('<COMPANY_ID>', 'saldo_inicial', 1000, date '2026-10-05');
--    insert into public.cash_entries (company_id, tipo, valor, descricao, data_lancamento)
--      values ('<COMPANY_ID>', 'entrada', 200, 'Venda de produto', date '2026-10-06'),
--             ('<COMPANY_ID>', 'despesa', 150, 'Conta de luz', date '2026-10-07');
--    select * from public.finance_summary('<COMPANY_ID>', date '2026-10-01', date '2026-10-31');
--      esperado: saldo_inicial_valor 1000 | saldo_inicial_no_periodo 1000 | entradas_avulsas 200 | despesas 150
--                e saldo_final = 1000 + receitas + 200 - comissoes - compras_estoque - 150
--    Periodo que comeca DEPOIS do saldo inicial (ex.: 08/10 a 31/10): saldo_anterior = 1000 + 200 - 150 + o que
--    houve entre 05/10 e 07/10 (receitas - comissoes - compras); saldo_inicial_no_periodo = 0.
--    Periodo inteiro ANTES de 05/10: tudo zero (o caixa so existe a partir da data do saldo inicial).
--
-- 3) Segundo saldo inicial na mesma empresa deve falhar (indice unico):
--    insert into public.cash_entries (company_id, tipo, valor, data_lancamento)
--      values ('<COMPANY_ID>', 'saldo_inicial', 500, date '2026-10-10');   -- ERRO esperado
--
-- 4) Limpar o teste:
--    delete from public.cash_entries where company_id = '<COMPANY_ID>';

-- #####################################################################################
-- ## ORIGEM: 017_etapa_clientes_vinculo_agendamentos.sql
-- #####################################################################################
-- Etapa 17: vinculo entre clientes e agendamentos
-- Execute no Supabase SQL Editor APOS 001..016. Seguro para reexecucao.
-- Rode em BLOCOS, na ordem. O bloco 4 (backfill) e opcional e tem previa antes.
--
-- O que resolve:
--   1) Qualquer membro da empresa (inclusive funcionario) pode CADASTRAR cliente. Necessario para
--      criar cliente direto no agendamento. Editar e excluir clientes continua so para admin.
--   2) Telefones de clientes ficam so com digitos (base para evitar duplicados).
--   3) Indices para a busca por telefone e por nome.
--   4) (opcional) Cria clientes a partir de agendamentos antigos que ficaram sem vinculo e liga os dois,
--      sem duplicar clientes que ja existem.

-- ================================================================ 1) policy de insert
drop policy if exists customers_insert_admin_same_company on public.customers;
drop policy if exists customers_insert_same_company on public.customers;

create policy customers_insert_same_company
on public.customers
for insert
to authenticated
with check (company_id = public.current_company_id());

-- ================================================================ 2) telefones so com digitos
update public.customers
set telefone = nullif(regexp_replace(telefone, '\D', '', 'g'), '')
where telefone is not null
  and telefone ~ '\D';

-- ================================================================ 3) indices de busca
create index if not exists idx_customers_company_telefone
  on public.customers (company_id, telefone)
  where telefone is not null;

create index if not exists idx_customers_company_nome_lower
  on public.customers (company_id, lower(trim(nome)));

-- (backfill opcional do 017 omitido neste arquivo)

-- #####################################################################################
-- ## ORIGEM: 018_etapa_onboarding_atomico.sql
-- #####################################################################################
-- Etapa 18: onboarding atomico (empresa + perfil admin + atendente numa unica transacao)
-- Execute no Supabase SQL Editor APOS 015..017. Seguro para reexecucao. So adiciona uma funcao;
-- nao altera nenhuma policy (o app antigo continua funcionando ate voce publicar o novo).
--
-- Problema corrigido: o onboarding fazia 3 inserts separados. Se o 2o ou o 3o falhava, sobrava uma
-- empresa orfa e a nova tentativa criava outra. Agora tudo acontece dentro de uma funcao: ou grava
-- tudo, ou nao grava nada. A funcao tambem e idempotente (clique duplo devolve a mesma empresa).
-- As mensagens de erro (P0001) sao escritas em portugues e podem ser exibidas ao usuario.

create or replace function public.create_company_with_admin(
  p_nome_responsavel text,
  p_nome_empresa text,
  p_telefone text default null,
  p_endereco text default null,
  p_unico_atendente boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_responsavel text := btrim(coalesce(p_nome_responsavel, ''));
  v_empresa text := btrim(coalesce(p_nome_empresa, ''));
  v_telefone text := nullif(btrim(coalesce(p_telefone, '')), '');
  v_endereco text := nullif(btrim(coalesce(p_endereco, '')), '');
  v_company_id uuid;
begin
  if v_uid is null or v_email = '' then
    raise exception 'Sua sessao expirou. Faca login novamente.';
  end if;

  if char_length(v_responsavel) < 3 or char_length(v_responsavel) > 120 then
    raise exception 'Informe seu nome com 3 a 120 caracteres.';
  end if;

  if char_length(v_empresa) < 2 or char_length(v_empresa) > 120 then
    raise exception 'Informe o nome da empresa com 2 a 120 caracteres.';
  end if;

  if char_length(coalesce(v_telefone, '')) > 30 or char_length(coalesce(v_endereco, '')) > 200 then
    raise exception 'Telefone ou endereco acima do tamanho permitido.';
  end if;

  -- Serializa chamadas simultaneas do mesmo usuario (duplo clique, duas abas).
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  -- Idempotente: se o usuario ja tem empresa, devolve a existente.
  select p.company_id into v_company_id from public.profiles p where p.id = v_uid;
  if found then
    return v_company_id;
  end if;

  insert into public.companies (nome, telefone, endereco)
  values (v_empresa, v_telefone, v_endereco)
  returning id into v_company_id;

  insert into public.profiles (id, company_id, nome, email, role)
  values (v_uid, v_company_id, v_responsavel, v_email, 'admin');

  if coalesce(p_unico_atendente, false) then
    insert into public.employees (company_id, user_id, nome, email, telefone, percentual_comissao, ativo)
    values (v_company_id, v_uid, v_responsavel, v_email, v_telefone, null, true);
  end if;

  return v_company_id;
end;
$$;

revoke all on function public.create_company_with_admin(text, text, text, text, boolean) from public;
revoke all on function public.create_company_with_admin(text, text, text, text, boolean) from anon;
grant execute on function public.create_company_with_admin(text, text, text, text, boolean) to authenticated;

-- ---------------------------------------------------------------- testes (SQL Editor, um bloco por vez)
-- Use o id/e-mail de um usuario de teste que AINDA NAO tenha perfil. Cada bloco termina em ROLLBACK.
--
-- T1) Cria tudo e devolve o id da empresa:
--   begin;
--   select set_config('request.jwt.claims',
--     json_build_object('sub','<ID_USUARIO>','role','authenticated','email','<EMAIL>')::text, true);
--   set local role authenticated;
--   select public.create_company_with_admin('Fulano de Tal', 'Barbearia Teste', '11999990000', 'Rua X, 1', true);
--   select id, role from public.profiles where id = '<ID_USUARIO>';
--   select nome, percentual_comissao from public.employees where user_id = '<ID_USUARIO>';
--   rollback;
--
-- T2) Idempotencia: chamar duas vezes na mesma transacao devolve o MESMO uuid.
-- T3) Nome da empresa com 1 caractere -> ERRO "Informe o nome da empresa com 2 a 120 caracteres."
-- T4) Sem jwt (SQL Editor puro) -> ERRO "Sua sessao expirou. Faca login novamente."

-- #####################################################################################
-- ## ORIGEM: 019_etapa_fechar_criacao_direta.sql
-- #####################################################################################
-- Etapa 19: fecha a criacao direta de empresa e de perfil admin pelo cliente.
-- APLIQUE SOMENTE DEPOIS de: (1) rodar o 018, (2) publicar o app que usa create_company_with_admin,
-- (3) testar o onboarding de uma conta nova em producao. Antes disso, o app antigo quebraria.
--
-- Efeito: usuario logado nao consegue mais inserir em companies nem criar um perfil admin "por conta
-- propria" (nem em empresa sem perfis, criada pelo master). Perfil novo so nasce por:
--   a) create_company_with_admin (onboarding), ou
--   b) convite pendente e valido para o e-mail do usuario.
-- Empresas criadas pelo master continuam recebendo o primeiro admin via modo suporte/convite.

drop policy if exists companies_insert_without_company on public.companies;
revoke insert on public.companies from authenticated;

drop policy if exists profiles_insert_bootstrap_or_invite on public.profiles;
drop policy if exists profiles_insert_invite on public.profiles;

create policy profiles_insert_invite
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  and email = lower(coalesce(auth.jwt() ->> 'email', ''))
  and public.has_valid_invite(company_id, role)
);

-- Conferencia: deve listar SOMENTE profiles_insert_invite (nenhuma policy de INSERT em companies).
--   select tablename, policyname from pg_policies
--   where schemaname = 'public' and tablename in ('companies','profiles') and cmd = 'INSERT';
--
-- Rollback (se algo der errado): reaplique o 015_etapa_hardening_permissoes.sql e rode
--   grant insert on public.companies to authenticated;

-- #####################################################################################
-- ## ORIGEM: 020_etapa_status_conta.sql
-- #####################################################################################
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

-- #####################################################################################
-- ## ORIGEM: 021_etapa_convite_funcionario.sql
-- #####################################################################################
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

-- #####################################################################################
-- ## ORIGEM: 022_etapa_logo_empresa_storage.sql
-- #####################################################################################
-- Logo da empresa: bucket publico + policies por empresa

-- 1) Bucket publico "company-logos" (2 MB, so png/jpeg/webp, sem SVG)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-logos',
  'company-logos',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- 2) Limpa policies antigas (se existirem)
drop policy if exists company_logos_select_public on storage.objects;
drop policy if exists company_logos_insert_admin_same_company on storage.objects;
drop policy if exists company_logos_update_admin_same_company on storage.objects;
drop policy if exists company_logos_delete_admin_same_company on storage.objects;

-- 3) Leitura publica das logos
create policy company_logos_select_public
on storage.objects
for select
to public
using (bucket_id = 'company-logos');

-- 4) Somente admin da empresa grava na propria pasta ({company_id}/arquivo)
create policy company_logos_insert_admin_same_company
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'company-logos'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = public.current_company_id()
      and p.role = 'admin'
  )
);

create policy company_logos_update_admin_same_company
on storage.objects
for update
to authenticated
using (
  bucket_id = 'company-logos'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = public.current_company_id()
      and p.role = 'admin'
  )
)
with check (
  bucket_id = 'company-logos'
  and (storage.foldername(name))[1] = public.current_company_id()::text
);

create policy company_logos_delete_admin_same_company
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'company-logos'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = public.current_company_id()
      and p.role = 'admin'
  )
);

-- #####################################################################################
-- ## ORIGEM: 023a etapa excluir atendimento enum.sql
-- #####################################################################################
-- 023a: novo status "excluido" para agendamentos.
-- Execute SOZINHO no Supabase SQL Editor, ANTES do 023b (o PostgreSQL exige que
-- o novo valor do enum seja confirmado antes de ser usado). Seguro para reexecucao.

alter type public.appointment_status add value if not exists 'excluido';

-- #####################################################################################
-- ## ORIGEM: 023b etapa excluir atendimento antifraude.sql
-- #####################################################################################
-- 023b: exclusao "mantem o registro" + protecao contra fraude no banco.
-- Execute no Supabase SQL Editor APOS o 023a. Seguro para reexecucao.
-- Faca backup ou teste antes em um projeto de desenvolvimento.
--
-- O que muda:
--   1) Agendamento excluido NAO some: fica com status 'excluido', guardando quem
--      excluiu, quando, o valor estornado e o motivo.
--   2) Funcionario nao consegue mais, direto pela API, apagar/editar pagamentos
--      nem alterar um atendimento concluido.
--   3) A unica forma de excluir um atendimento (com ou sem pagamento) e a funcao
--      void_appointment, restrita a admin, atomica e com auditoria.
-- Service role e SQL Editor (auth.uid() nulo) continuam livres para manutencao.

-- ---------------------------------------------------------------- colunas
alter table public.appointments
  add column if not exists excluido_em timestamptz,
  add column if not exists excluido_por uuid references auth.users(id) on delete set null,
  add column if not exists valor_estornado numeric(10,2),
  add column if not exists motivo_exclusao text;

-- ---------------------------------------------------------------- appointments: guarda de UPDATE
create or replace function public.guard_appointments_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  -- Excluido e definitivo para todos.
  if old.status = 'excluido' then
    raise exception 'Atendimento excluido nao pode ser alterado.';
  end if;

  -- Marcar como excluido so e permitido depois de remover o pagamento (via void_appointment).
  if new.status = 'excluido' and exists (
    select 1 from public.payments p where p.appointment_id = new.id
  ) then
    raise exception 'Use a exclusao de atendimento para estornar o pagamento.';
  end if;

  if public.is_company_admin() then
    return new;
  end if;

  if old.status = 'concluido' then
    raise exception 'Somente o administrador pode alterar um atendimento concluido.';
  end if;

  if new.status = 'excluido'
     or new.excluido_em is not null
     or new.excluido_por is not null
     or new.valor_estornado is not null
     or new.motivo_exclusao is not null then
    raise exception 'Somente o administrador pode excluir atendimentos.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_appointments_guard_update on public.appointments;
create trigger trg_appointments_guard_update
before update on public.appointments
for each row execute function public.guard_appointments_update();

-- ---------------------------------------------------------------- appointments: DELETE
-- Antes: policy "for all" liberava DELETE para qualquer usuario da empresa.
-- Agora: SELECT/INSERT/UPDATE da empresa; DELETE so de admin e so se nao houver pagamento.
drop policy if exists appointments_crud_same_company on public.appointments;
drop policy if exists appointments_select_same_company on public.appointments;
drop policy if exists appointments_insert_same_company on public.appointments;
drop policy if exists appointments_update_same_company on public.appointments;
drop policy if exists appointments_delete_admin_no_payment on public.appointments;

create policy appointments_select_same_company
on public.appointments for select to authenticated
using (company_id = public.current_company_id());

create policy appointments_insert_same_company
on public.appointments for insert to authenticated
with check (company_id = public.current_company_id());

create policy appointments_update_same_company
on public.appointments for update to authenticated
using (company_id = public.current_company_id())
with check (company_id = public.current_company_id());

create policy appointments_delete_admin_no_payment
on public.appointments for delete to authenticated
using (
  company_id = public.current_company_id()
  and public.is_company_admin()
  and not exists (select 1 from public.payments p where p.appointment_id = appointments.id)
);

-- ---------------------------------------------------------------- payments
-- Antes: policy "for all". Agora: ler e inserir (empresa), editar so admin,
-- e NAO existe DELETE: o pagamento so sai via void_appointment.
drop policy if exists payments_crud_same_company on public.payments;
drop policy if exists payments_select_same_company on public.payments;
drop policy if exists payments_insert_same_company on public.payments;
drop policy if exists payments_update_admin on public.payments;

create policy payments_select_same_company
on public.payments for select to authenticated
using (company_id = public.current_company_id());

create policy payments_insert_same_company
on public.payments for insert to authenticated
with check (company_id = public.current_company_id());

create policy payments_update_admin
on public.payments for update to authenticated
using (company_id = public.current_company_id() and public.is_company_admin())
with check (company_id = public.current_company_id() and public.is_company_admin());

revoke delete on public.payments from authenticated;

-- ---------------------------------------------------------------- funcao de exclusao
create or replace function public.void_appointment(
  p_appointment_id uuid,
  p_motivo text default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid := public.current_company_id();
  v_appt public.appointments%rowtype;
  v_valor numeric(10,2);
  v_motivo text := nullif(trim(coalesce(p_motivo, '')), '');
begin
  if auth.uid() is null or v_company is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if not public.is_company_admin() then
    raise exception 'Somente o administrador pode excluir atendimentos.';
  end if;

  select * into v_appt
  from public.appointments
  where id = p_appointment_id and company_id = v_company
  for update;

  if not found then
    raise exception 'Agendamento nao encontrado.';
  end if;

  if v_appt.status = 'excluido' then
    raise exception 'Este agendamento ja foi excluido.';
  end if;

  select p.valor into v_valor
  from public.payments p
  where p.appointment_id = v_appt.id and p.company_id = v_company;

  delete from public.payments
  where appointment_id = v_appt.id and company_id = v_company;

  update public.appointments
  set status = 'excluido',
      excluido_em = now(),
      excluido_por = auth.uid(),
      valor_estornado = v_valor,
      motivo_exclusao = v_motivo
  where id = v_appt.id and company_id = v_company;

  insert into public.audit_logs (company_id, actor_id, action, entity, entity_id, metadata)
  values (
    v_company,
    auth.uid(),
    'appointment.void',
    'appointment',
    v_appt.id::text,
    jsonb_build_object(
      'cliente_nome', v_appt.cliente_nome,
      'status_anterior', v_appt.status::text,
      'valor_estornado', v_valor,
      'motivo', v_motivo
    )
  );

  return v_valor;
end;
$$;

revoke all on function public.void_appointment(uuid, text) from public;
grant execute on function public.void_appointment(uuid, text) to authenticated;

-- #####################################################################################
-- ## ORIGEM: 024_etapa_saldo_inicial_pix_conta.sql
-- #####################################################################################
-- Etapa 24: saldo inicial detalhado em Pix e Conta bancaria
-- Execute no Supabase SQL Editor APOS 001..023b e ANTES de publicar o app novo. Seguro para reexecucao.
--
-- Modelo:
--   cash_entries.valor        -> continua sendo o saldo inicial TOTAL (e o que a finance_summary usa).
--   cash_entries.valor_pix    -> quanto desse total estava no Pix.
--   cash_entries.valor_conta  -> quanto desse total estava em conta bancaria.
--   Dinheiro em caixa = valor - valor_pix - valor_conta (calculado no app, nao e gravado).
--
-- Por isso a finance_summary NAO muda e o saldo ja cadastrado continua valendo
-- (fica com Pix = 0 e Conta = 0, tudo considerado "em caixa").

alter table public.cash_entries
  add column if not exists valor_pix numeric(12,2) not null default 0,
  add column if not exists valor_conta numeric(12,2) not null default 0;

alter table public.cash_entries
  drop constraint if exists cash_entries_detalhe_saldo_check;

-- Pix e conta nao podem ser negativos e so existem no saldo inicial.
alter table public.cash_entries
  add constraint cash_entries_detalhe_saldo_check check (
    valor_pix >= 0
    and valor_conta >= 0
    and (tipo = 'saldo_inicial' or (valor_pix = 0 and valor_conta = 0))
  );

-- As colunas novas precisam entrar nos GRANTs por coluna (016 revogou o acesso geral).
grant insert (valor_pix, valor_conta) on public.cash_entries to authenticated;
grant update (valor_pix, valor_conta) on public.cash_entries to authenticated;

-- Conferencia:
--   select tipo, valor, valor_pix, valor_conta from public.cash_entries where tipo = 'saldo_inicial';

-- #####################################################################################
-- ## ORIGEM: 025_etapa_tema_empresa.sql
-- #####################################################################################
-- Etapa 25: tema de cores da empresa
-- Execute no Supabase SQL Editor APOS 001..024. Seguro para reexecucao.
--
-- Cada empresa escolhe uma paleta (cor de destaque do app). O valor e uma chave de uma
-- lista fixa; as cores em si ficam no codigo (src/lib/themes.ts), nunca no banco.
-- Quem altera: administrador da empresa, pela policy companies_update_admin ja existente
-- (o gatilho de 020 so protege plano/status, entao a coluna nova nao precisa de ajuste).
-- Se criar um tema novo no codigo, inclua a chave tambem no check abaixo.

alter table public.companies
  add column if not exists tema text not null default 'ouro';

alter table public.companies
  drop constraint if exists companies_tema_check;

alter table public.companies
  add constraint companies_tema_check
  check (tema in ('ouro', 'vermelho', 'azul', 'verde', 'cobre', 'roxo'));

-- O UPDATE em companies e liberado por coluna no seu banco (a logo funciona, a coluna nova nao):
-- sem este GRANT o app recebe o erro 42501 (permission denied) ao salvar o tema.
grant update (tema) on public.companies to authenticated;

-- Conferencia:
--   select nome, tema from public.companies;
