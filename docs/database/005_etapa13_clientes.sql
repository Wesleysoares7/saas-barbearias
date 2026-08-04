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
