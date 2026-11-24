-- Etapa 35a: novo status de agendamento (aguardando confirmacao).
alter type public.appointment_status add value if not exists 'aguardando';