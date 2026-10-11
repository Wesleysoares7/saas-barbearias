-- Etapa 19: fecha a criacao direta de empresa e de perfil admin pelo cliente.
-- APLIQUE SOMENTE DEPOIS de: (1) rodar o 018, (2) publicar o app que usa create_company_with_admin,
-- (3) testar o onboarding de uma conta nova em producao. Antes disso, o app antigo quebraria.
--
-- Efeito: usuario logado nao consegue mais inserir em companies nem criar um perfil admin "por conta
-- propria" (nem em empresa sem perfis, criada pelo master). Perfil novo so nasce por:
--   a) create_company_with_admin (onboarding), ou
--   b) convite pendente e valido para o e-mail do usuario.
-- Empresas criadas pelo master continuam recebendo o primeiro admin via modo suporte/convite.

drop policy if exists companies_insert_without_company on public.companies;
revoke insert on public.companies from authenticated;

drop policy if exists profiles_insert_bootstrap_or_invite on public.profiles;
drop policy if exists profiles_insert_invite on public.profiles;

create policy profiles_insert_invite
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  and email = lower(coalesce(auth.jwt() ->> 'email', ''))
  and public.has_valid_invite(company_id, role)
);

-- Conferencia: deve listar SOMENTE profiles_insert_invite (nenhuma policy de INSERT em companies).
--   select tablename, policyname from pg_policies
--   where schemaname = 'public' and tablename in ('companies','profiles') and cmd = 'INSERT';
--
-- Rollback (se algo der errado): reaplique o 015_etapa_hardening_permissoes.sql e rode
--   grant insert on public.companies to authenticated;