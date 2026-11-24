-- Etapa 35b: pedido aguardando tambem reserva o horario.
alter table public.appointments
  drop constraint if exists appointments_no_overlap_per_employee;

alter table public.appointments
  add constraint appointments_no_overlap_per_employee
  exclude using gist (
    company_id with =,
    employee_id with =,
    tstzrange(data_hora, data_hora_fim, '[)') with &&
  )
  where (status in ('agendado', 'aguardando'));