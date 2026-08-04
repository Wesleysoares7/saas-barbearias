# Roadmap

## Etapa 1 - Base do projeto
Status: Concluida em 2026-07-04

Checklist:
- [x] Criar projeto Next.js
- [x] Configurar TailwindCSS
- [x] Configurar shadcn/ui
- [x] Configurar Supabase (dependencias e clientes)
- [x] Criar estrutura inicial de pastas
- [x] Criar documentacao inicial
- [x] Criar tela inicial de login
- [x] Criar conexao com banco
- [x] Criar variaveis .env.example
- [x] Criar rota de teste da conexao Supabase

## Etapa 2 - Autenticacao
Status: Concluida em 2026-07-04

Checklist:
- [x] Login real com Supabase Auth
- [x] Cadastro de conta
- [x] Recuperacao de senha por e-mail
- [x] Pagina de atualizacao de senha
- [x] Protecao basica de rotas

## Etapa 3 - Modelagem SQL e RLS
Status: Concluida em 2026-07-04

Checklist:
- [x] Criar script SQL inicial para tabelas obrigatorias
- [x] Definir enums e constraints
- [x] Definir indices principais
- [x] Implementar RLS multi-tenant
- [x] Documentar execucao no Supabase SQL Editor

## Etapa 4 - Bootstrap inicial da empresa
Status: Concluida em 2026-07-04

Checklist:
- [x] Criar rota de onboarding para primeiro acesso
- [x] Criar formulario para cadastrar empresa inicial
- [x] Criar perfil admin inicial vinculado a empresa
- [x] Redirecionar usuario sem empresa para onboarding
- [x] Atualizar documentacao da etapa

## Etapa 5 - CRUD de funcionarios e servicos
Status: Concluida em 2026-07-04

Checklist:
- [x] Criar CRUD de funcionarios
- [x] Criar CRUD de servicos
- [x] Validar isolamento por empresa (company_id)
- [x] Adicionar estados de loading e mensagens de erro/sucesso
- [x] Atualizar documentacao da etapa

## Etapa 6 - CRUD inicial de agendamentos
Status: Concluida em 2026-07-04

Checklist:
- [x] Criar CRUD de agendamentos
- [x] Vincular agendamento a funcionario e servico
- [x] Validar isolamento por empresa (company_id)
- [x] Adicionar estados de loading e mensagens de feedback
- [x] Calcular e persistir data_hora_fim automaticamente
- [x] Bloquear conflitos de horario por funcionario (frontend e backend)
- [x] Atualizar documentacao da etapa

## Etapa 7 - CRUD inicial do financeiro
Status: Concluida em 2026-07-04

Checklist:
- [x] Criar CRUD de pagamentos em `/painel/financeiro`
- [x] Vincular pagamento somente a agendamento concluido
- [x] Impedir pagamento duplicado por agendamento
- [x] Calcular e persistir valor de comissao automaticamente
- [x] Atualizar painel e documentacao da etapa

## Etapa 8 - Dashboard com indicadores
Status: Concluida em 2026-07-04

Checklist:
- [x] Dashboard inicial no painel com Agenda do dia e contadores por status
- [x] Indicador de faturamento do dia
- [x] Indicador de servicos mais vendidos
- [x] Atualizar documentacao de encerramento da etapa

## Etapa 9 - Relatorios e exportacao
Status: Concluida em 2026-07-04

Checklist:
- [x] Criar modulo de relatorios em `/painel/relatorios`
- [x] Exportar CSV de agendamentos por periodo
- [x] Exportar CSV de financeiro por periodo
- [x] Exportacao em PDF (agendamentos e financeiro)
- [x] Atualizar documentacao de encerramento da etapa

## Etapa 10 - Permissoes e papeis avancados
Status: Concluida em 2026-07-04

Checklist:
- [x] Criar base de RBAC com leitura de papel (`admin` e `employee`) no backend
- [x] Restringir modulos criticos (funcionarios, servicos, financeiro) para admin
- [x] Aplicar validacao de permissao nas pages e nas server actions
- [x] Permissoes granulares por operacao (leitura vs escrita)
- [x] Gestao de membros/equipe com troca de papel
- [x] Atualizar documentacao de encerramento da etapa

## Etapa 11 - Convites e auditoria
Status: Concluida em 2026-07-04

Checklist:
- [x] Criar estrutura de convites por e-mail no modulo de equipe
- [x] Permitir criar/listar/revogar convites por admin
- [x] Preparar script SQL para `team_invites` e `audit_logs`
- [x] Fluxo completo de aceite de convite por token
- [x] Exibicao dedicada da trilha de auditoria no painel
- [x] Atualizar documentacao de encerramento da etapa

## Etapa 12 - Melhorias operacionais
Status: Concluida em 2026-07-04

Checklist:
- [x] Filtros avancados na auditoria (periodo, acao, entidade e busca textual)
- [x] Exportacao da auditoria (CSV/PDF)
- [x] Automacoes de notificacao para eventos sensiveis
- [x] Atualizar documentacao de encerramento da etapa

## Etapa 13 - Clientes e relacionamento
Status: Concluida em 2026-07-04

Checklist:
- [x] Criar estrutura SQL de clientes (`customers`) com RLS
- [x] Criar modulo `/painel/clientes` com CRUD inicial
- [x] Integrar clientes ao fluxo de agendamentos
- [x] Historico de atendimentos por cliente
- [x] Atualizar documentacao de encerramento da etapa

## Proximas etapas (aguardando autorizacao)
- Definir Etapa 14.
