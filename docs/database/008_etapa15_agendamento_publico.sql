-- Etapa 15: Canal publico de agendamento para clientes
-- Execute no Supabase SQL Editor apos as etapas 001, 002 e 006.

alter table public.companies
  add column if not exists public_slug text,
  add column if not exists public_booking_enabled boolean not null default false;

alter table public.companies
  drop constraint if exists companies_public_slug_format;

alter table public.companies
  add constraint companies_public_slug_format
  check (public_slug is null or public_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

create unique index if not exists companies_public_slug_unique
  on public.companies (lower(public_slug))
  where public_slug is not null;

-- Remove policies antigas (idempotente)
drop policy if exists companies_public_booking_select on public.companies;
drop policy if exists employees_public_booking_select on public.employees;
drop policy if exists services_public_booking_select on public.services;
drop policy if exists appointments_public_booking_insert_anon on public.appointments;

-- Empresas disponiveis para agendamento publico (somente anon)
create policy companies_public_booking_select
on public.companies
for select
to anon
using (
  public_booking_enabled = true
  and public_slug is not null
);

-- Catalogo publico de profissionais ativos
create policy employees_public_booking_select
on public.employees
for select
to anon
using (
  ativo = true
  and exists (
    select 1
    from public.companies c
    where c.id = employees.company_id
      and c.public_booking_enabled = true
      and c.public_slug is not null
  )
);

-- Catalogo publico de servicos ativos
create policy services_public_booking_select
on public.services
for select
to anon
using (
  ativo = true
  and exists (
    select 1
    from public.companies c
    where c.id = services.company_id
      and c.public_booking_enabled = true
      and c.public_slug is not null
  )
);

-- Insercao publica de agendamentos com regras minimas
create policy appointments_public_booking_insert_anon
on public.appointments
for insert
to anon
with check (
  customer_id is null
  and status = 'agendado'
  and char_length(trim(cliente_nome)) >= 2
  and (cliente_telefone is null or char_length(trim(cliente_telefone)) >= 8)
  and data_hora > now()
  and data_hora_fim > data_hora
  and exists (
    select 1
    from public.companies c
    where c.id = appointments.company_id
      and c.public_booking_enabled = true
      and c.public_slug is not null
  )
  and exists (
    select 1
    from public.employees e
    where e.id = appointments.employee_id
      and e.company_id = appointments.company_id
      and e.ativo = true
  )
  and exists (
    select 1
    from public.services s
    where s.id = appointments.service_id
      and s.company_id = appointments.company_id
      and s.ativo = true
  )
);
