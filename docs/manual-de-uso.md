# Manual de Uso - SaaS Barbearias

## 1. Visao geral
Este sistema permite gerenciar uma barbearia em modelo SaaS com isolamento por empresa (multi-tenant).

Principais recursos:
- Autenticacao (login, cadastro, recuperacao de senha)
- Onboarding da empresa no primeiro acesso
- Dashboard com indicadores
- CRUD de funcionarios, servicos, clientes, agendamentos e financeiro
- Gestao de equipe e papeis
- Convites por e-mail
- Auditoria e notificacoes sensiveis
- Relatorios com exportacao CSV/PDF

## 2. Perfis de acesso
Existem dois papeis:
- admin: acesso completo aos modulos
- employee: acesso limitado (agendamentos e relatorios)

## 3. Requisitos para rodar
- Node.js 22+ (recomendado)
- Projeto Supabase criado
- Banco com scripts SQL aplicados na ordem correta

## 4. Configuracao inicial
### 4.1 Variaveis de ambiente
Crie o arquivo .env.local com base no .env.example.

Campos obrigatorios:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

Campo opcional (futuras integracoes administrativas):
- SUPABASE_SERVICE_ROLE_KEY

### 4.2 Instalar dependencias
Execute:
- npm install

### 4.3 Rodar aplicacao
Execute:
- npm run dev

Acesse:
- http://localhost:3000

## 5. Banco de dados (ordem recomendada)
No Supabase SQL Editor, execute os scripts:
1. docs/database/001_etapa3_schema_rls.sql
2. docs/database/002_etapa6_conflito_agendamentos.sql
3. docs/database/003_etapa11_convites_auditoria.sql
4. docs/database/004_etapa12_notificacoes.sql
5. docs/database/005_etapa13_clientes.sql
6. docs/database/006_etapa13_agendamentos_clientes.sql

Se algum modulo acusar erro de tabela/campo ausente, revalide se todos os scripts acima foram executados.

## 6. Primeiro acesso (fluxo admin)
1. Acesse /login
2. Clique em Cadastrar para criar usuario
3. Confirme e-mail (se habilitado no Supabase)
4. Apos login, o sistema envia para /onboarding
5. No onboarding, informe:
- nome do responsavel
- nome da empresa
- telefone (opcional)
- endereco (opcional)
6. Finalize o cadastro
7. Sistema redireciona para /painel

## 7. Navegacao principal
Tela principal:
- /painel

Modulos:
- /painel/funcionarios
- /painel/servicos
- /painel/clientes
- /painel/agendamentos
- /painel/financeiro
- /painel/equipe
- /painel/auditoria
- /painel/notificacoes
- /painel/relatorios

## 8. Operacao recomendada (ordem diaria)
1. Funcionarios
- Cadastre os profissionais
- Defina percentual de comissao

2. Servicos
- Cadastre servicos com duracao e valor

3. Clientes
- Cadastre clientes para historico e relacionamento

4. Agendamentos
- Crie agendamentos vinculando cliente, funcionario e servico
- Sistema bloqueia conflito de horario por funcionario

5. Financeiro
- Registre pagamento apenas para agendamento concluido
- Sistema calcula valor de comissao automaticamente

6. Relatorios
- Exporte CSV/PDF por periodo para operacao e gestao

## 9. Detalhe por modulo
### 9.1 Dashboard
- Mostra agenda do dia
- Mostra faturamento diario
- Mostra status dos agendamentos
- Mostra servicos mais vendidos no mes

### 9.2 Funcionarios
- Criar, editar, ativar/inativar e remover
- Campo de comissao com validacao

### 9.3 Servicos
- Criar, editar, ativar/inativar e remover
- Campos de duracao e valor com validacao

### 9.4 Clientes
- Criar, editar, ativar/inativar e remover
- Historico individual por cliente em /painel/clientes/[id]

### 9.5 Agendamentos
- Criar, editar e (para admin) excluir
- Vinculo com funcionario e servico da mesma empresa
- Validacao de conflito de horario

### 9.6 Financeiro
- Criar, editar e excluir pagamentos
- Um pagamento por agendamento
- Filtros por periodo
- Resumo por funcionario

### 9.7 Equipe
- Alteracao de papel (admin/employee)
- Convites por e-mail
- Revogacao de convites

### 9.8 Auditoria
- Lista eventos sensiveis
- Filtros por periodo, acao, entidade e texto
- Exportacao CSV/PDF

### 9.9 Notificacoes sensiveis
- Exibe alertas de eventos criticos
- Marcar item como lido
- Marcar todas como lidas

### 9.10 Relatorios
- Exportacao de agendamentos (CSV/PDF)
- Exportacao de financeiro (CSV/PDF)
- Filtro por intervalo de datas

## 10. Permissoes (resumo)
Admin:
- Acesso total a todos os modulos e operacoes

Equipe (employee):
- Pode acessar agendamentos e relatorios
- Nao pode acessar modulos administrativos restritos

## 11. Erros comuns e solucao
1. Erro de sessao expirada
- Faca login novamente em /login

2. Erro de empresa nao encontrada
- Finalize onboarding em /onboarding

3. Erro em clientes, convites, auditoria ou notificacoes
- Verifique scripts SQL das etapas 11, 12 e 13

4. Erro de conflito de horario em agendamentos
- Horario ja ocupado para o funcionario
- Escolha outro horario

5. Erro de pagamento duplicado
- Cada agendamento concluido aceita apenas um pagamento

## 12. Boas praticas operacionais
- Cadastre servicos e funcionarios antes de iniciar agenda
- Use clientes cadastrados para manter historico consolidado
- Defina papeis corretos da equipe para seguranca
- Revise auditoria periodicamente
- Exporte relatorios no fechamento diario/semanal

## 13. Checklist rapido de abertura
- Login funcionando
- Modulos carregando sem erro de schema
- Agenda com funcionarios e servicos ativos
- Financeiro registrando pagamentos
- Relatorios exportando CSV/PDF

## 14. Referencias internas
- docs/roadmap.md
- docs/rules.md
- docs/database.md
- docs/database/README.md
- docs/changelog.md
