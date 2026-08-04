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
