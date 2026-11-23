-- Etapa 34: horarios de atendimento + configuracao do agendamento online.
-- Seguro para reexecucao.

-- 1) configuracao publica da empresa
alter table public.companies
  add column if not exists slug text,
  add column if not exists agendamento_online boolean not null default false,
  add column if not exists agendamento_intervalo_min integer not null default 30,
  add column if not exists agendamento_antecedencia_min integer not null default 60,
  add column if not exists agendamento_dias_max integer not null default 30;

alter table public.companies drop constraint if exists companies_slug_format;
alter table public.companies add constraint companies_slug_format
  check (
    slug is null
    or (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 40)
  );

alter table public.companies drop constraint if exists companies_agendamento_config_range;
alter table public.companies add constraint companies_agendamento_config_range
  check (
    agendamento_intervalo_min in (10, 15, 20, 30, 45, 60)
    and agendamento_antecedencia_min between 0 and 1440
    and agendamento_dias_max between 1 and 90
  );

create unique index if not exists idx_companies_slug_unique
  on public.companies (slug) where slug is not null;

-- 026 limitou o UPDATE do admin a uma lista de colunas: libera as novas.
grant update (
  slug,
  agendamento_online,
  agendamento_intervalo_min,
  agendamento_antecedencia_min,
  agendamento_dias_max
) on public.companies to authenticated;

-- 2) horarios de atendimento por funcionario (1 linha por intervalo)
create table if not exists public.employee_work_hours (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null,
  weekday smallint not null,
  start_minute integer not null,
  end_minute integer not null,
  created_at timestamptz not null default now(),
  constraint employee_work_hours_employee_fk
    foreign key (employee_id, company_id)
    references public.employees (id, company_id)
    on delete cascade,
  constraint employee_work_hours_weekday check (weekday between 0 and 6),
  constraint employee_work_hours_range check (
    start_minute between 0 and 1439
    and end_minute between 1 and 1440
    and end_minute > start_minute
  ),
  constraint employee_work_hours_no_overlap
    exclude using gist (
      employee_id with =,
      weekday with =,
      int4range(start_minute, end_minute, '[)') with &&
    )
);

create index if not exists idx_employee_work_hours_lookup
  on public.employee_work_hours (company_id, employee_id, weekday);

alter table public.employee_work_hours enable row level security;

drop policy if exists employee_work_hours_select_same_company on public.employee_work_hours;
create policy employee_work_hours_select_same_company
on public.employee_work_hours
for select to authenticated
using (company_id = public.current_company_id());

drop policy if exists employee_work_hours_write_admin on public.employee_work_hours;
create policy employee_work_hours_write_admin
on public.employee_work_hours
for all to authenticated
using (company_id = public.current_company_id() and public.is_company_admin())
with check (company_id = public.current_company_id() and public.is_company_admin());

grant select, insert, update, delete on public.employee_work_hours to authenticated;