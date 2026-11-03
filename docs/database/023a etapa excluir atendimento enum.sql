-- 023a: novo status "excluido" para agendamentos.
-- Execute SOZINHO no Supabase SQL Editor, ANTES do 023b (o PostgreSQL exige que
-- o novo valor do enum seja confirmado antes de ser usado). Seguro para reexecucao.

alter type public.appointment_status add value if not exists 'excluido';