-- Etapa 37: marca cancelamentos feitos pelo cliente. Seguro para reexecucao.
alter table public.appointments
  add column if not exists cancelado_pelo_cliente_em timestamptz;

create index if not exists idx_appointments_client_cancel
  on public.appointments (company_id, cancelado_pelo_cliente_em desc)
  where cancelado_pelo_cliente_em is not null;