-- Etapa 31: indices para o Financeiro. Seguro para reexecucao.
create index if not exists idx_payments_company_created
  on public.payments (company_id, created_at desc);

create index if not exists idx_appointments_company_status_data
  on public.appointments (company_id, status, data_hora desc);