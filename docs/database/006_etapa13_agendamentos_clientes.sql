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
