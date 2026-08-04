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
