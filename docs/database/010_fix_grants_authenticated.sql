-- Correcao: privilegios (GRANT) ausentes para o role authenticated
-- Execute no Supabase SQL Editor apos as etapas 001 a 009.
--
-- Contexto do problema:
-- Ao criar as tabelas manualmente pelo SQL Editor (executado como "postgres"),
-- os privilegios padrao que o Supabase normalmente concede a "authenticated"/"anon"
-- (configurados via ALTER DEFAULT PRIVILEGES para o role "supabase_admin") nao sao
-- herdados automaticamente. O RLS (Row Level Security) so restringe QUAIS linhas
-- um role pode ver/alterar; ele nao concede acesso à tabela em si. Sem o GRANT
-- basico na tabela, qualquer operacao falha com "permission denied for table X",
-- mesmo com as policies corretas.
--
-- Este script concede os privilegios minimos necessarios para o funcionamento
-- das policies ja criadas nos scripts anteriores. Seguro para reexecucao.

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.companies to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.employees to authenticated;
grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.appointments to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select, insert, update, delete on public.team_invites to authenticated;
grant select, insert, update, delete on public.audit_logs to authenticated;
grant select, insert, update, delete on public.security_notifications to authenticated;
grant select, insert, update, delete on public.customers to authenticated;
grant select on public.platform_admins to authenticated;
