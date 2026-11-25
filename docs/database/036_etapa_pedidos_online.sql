-- Etapa 36: pedidos online. Seguro para reexecucao.
alter table public.appointments
  add column if not exists origem text not null default 'painel',
  add column if not exists public_token uuid not null default gen_random_uuid();

alter table public.appointments drop constraint if exists appointments_origem_check;
alter table public.appointments
  add constraint appointments_origem_check check (origem in ('painel', 'online'));

-- token que o cliente usara para acompanhar o pedido (etapa 5)
create unique index if not exists idx_appointments_public_token
  on public.appointments (public_token);

-- apoio ao limite de pedidos por telefone
create index if not exists idx_appointments_online_phone
  on public.appointments (company_id, cliente_telefone, created_at desc)
  where origem = 'online';