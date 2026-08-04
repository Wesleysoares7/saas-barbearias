# Etapa 3 - Como executar SQL e RLS no Supabase

## Objetivo
Aplicar o schema inicial multi-tenant e as politicas de RLS no banco PostgreSQL do Supabase.

## Arquivo SQL da etapa
- `docs/database/001_etapa3_schema_rls.sql`

## Passo a passo (Supabase)
1. Acesse o projeto no painel do Supabase.
2. No menu lateral, clique em SQL Editor.
3. Clique em New query.
4. Abra o arquivo `docs/database/001_etapa3_schema_rls.sql` no projeto e copie todo o conteudo.
5. Cole no SQL Editor.
6. Clique em Run.

## Validacoes rapidas
1. Em Table Editor, confirme as tabelas:
   - companies
   - profiles
   - employees
   - services
   - appointments
   - payments
2. Em Authentication > Policies, confirme que RLS foi habilitado para todas as tabelas acima.

## Observacoes importantes
- Este script nao cria dashboard nem telas de agenda/financeiro.
- A funcao `current_company_id()` depende da existencia de registro em `profiles` para o usuario autenticado.
- No Supabase, a service role ignora RLS por design. Use apenas em processos administrativos controlados.
