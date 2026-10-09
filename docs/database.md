# Database

## Objetivo
Banco PostgreSQL no Supabase com arquitetura multi-tenant por empresa.

## Tabelas implementadas na Etapa 3
- companies
- profiles
- employees
- services
- appointments
- payments

## Arquivos SQL e guia
- `docs/database/001_etapa3_schema_rls.sql`
- `docs/database/etapa3_como_executar.md`
- `docs/database/002_etapa6_conflito_agendamentos.sql`
- `docs/database/etapa6_testes_basicos.md`
- `docs/database/003_etapa11_convites_auditoria.sql`
- `docs/database/004_etapa12_notificacoes.sql`
- `docs/database/005_etapa13_clientes.sql`
- `docs/database/006_etapa13_agendamentos_clientes.sql`
- `docs/database/007_etapa14_logo_empresa_storage.sql`
- `docs/database/008_etapa15_agendamento_publico.sql`
- `docs/database/009_etapa16_master_plataforma.sql`
- `docs/database/014_etapa_almoxarifado_estoque.sql` (tabelas `products` e `stock_movements`)

## Estrategia multi-tenant
- Todas as tabelas de dominio terao company_id.
- O acesso sera isolado por RLS no Supabase.
- Usuarios autenticados so poderao acessar dados da propria empresa.

## Regras aplicadas no SQL
- Tipos enum para `role` e `status`.
- Constraints de validacao (percentuais, valores e duracao).
- Integridade multi-tenant com chaves compostas para impedir vinculos entre empresas diferentes.
- Funcao `current_company_id()` para centralizar filtros de tenant nas policies.
- RLS habilitado em todas as tabelas de dominio.

## Status
- Etapa 1: Conexao inicial com Supabase configurada no codigo.
- Etapa 2: Autenticacao implementada no app.
- Etapa 3: Script SQL com modelagem inicial e RLS criado e documentado.
- Etapa 4: Bootstrap de empresa e perfil admin implementado no app para primeiro acesso.
- Etapa 5: CRUD inicial de funcionarios e servicos implementado no painel com isolamento por empresa.
- Etapa 6: CRUD inicial de agendamentos implementado com vinculacao de funcionario e servico da mesma empresa.
- Etapa 7: CRUD inicial de pagamentos implementado no painel, vinculado a agendamentos concluidos.
- Etapa 11: Convites por e-mail e trilha de auditoria implementados no app com aceite por token.
- Etapa 12: Automacoes de notificacao para eventos sensiveis implementadas com caixa de notificacoes no painel.
- Etapa 13: Cadastro inicial de clientes implementado no app com CRUD em `/painel/clientes`.
- Etapa 16: Estrutura de acesso master implementada para visao global de empresas em `/master/empresas`.

## Reforco de conflito de horarios (Etapa 6)
- Campo `data_hora_fim` adicionado em `appointments`.
- Indices adicionados para consultas de disponibilidade.
- Regra de conflito reforcada no banco com exclusion constraint para o mesmo funcionario em status `agendado`.
- Validacao de conflito implementada no backend e no frontend.

## Regras de financeiro (Etapa 7)
- Pagamentos sao vinculados por `appointment_id` com unicidade (um pagamento por agendamento).
- Cadastro de pagamento permitido apenas para agendamento em status `concluido`.
- `valor_comissao` e persistido a partir de `valor` e `percentual_comissao`.
- Operacoes seguem isolamento por empresa via `company_id` e RLS.

## Convites e auditoria (Etapa 11)
- `team_invites` armazena convites com token, papel, expiracao e status (`pending`, `accepted`, `revoked`, `expired`).
- `audit_logs` armazena eventos sensiveis por empresa (ator, acao, entidade e metadata).
- Policies de `team_invites` permitem select na mesma empresa e escrita apenas por admin.
- Policies de `audit_logs` permitem leitura e escrita no escopo da empresa via `current_company_id()`.
- Policies adicionais de `team_invites` permitem que o usuario autenticado aceite o proprio convite por e-mail/token.

## Nota de migracao
- Se o script `003_etapa11_convites_auditoria.sql` foi executado antes desta versao, reexecute o script para atualizar as policies de aceite por token.
- Para habilitar notificacoes sensiveis, execute `004_etapa12_notificacoes.sql` no Supabase SQL Editor.
- Para habilitar cadastro de clientes, execute `005_etapa13_clientes.sql` no Supabase SQL Editor.
- Para integrar clientes aos agendamentos, execute `006_etapa13_agendamentos_clientes.sql` no Supabase SQL Editor.
- Para habilitar acesso master global, execute `009_etapa16_master_plataforma.sql`
- `docs/database/014_etapa_almoxarifado_estoque.sql` (tabelas `products` e `stock_movements`) no Supabase SQL Editor e inclua o `user_id` desejado em `public.platform_admins`.
