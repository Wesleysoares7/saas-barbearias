# Changelog

## 2026-08-04 - Rotina de seguranca no GitHub
### Adicionado
- Workflow de qualidade em `.github/workflows/ci.yml` para lint e build em Pull Request para `main`.
- Workflow de seguranca em `.github/workflows/security.yml` com `npm audit` para vulnerabilidades altas e criticas.
- Workflow de analise estatica em `.github/workflows/codeql.yml` para verificacoes de seguranca no codigo.
- Configuracao do Dependabot em `.github/dependabot.yml` para atualizar dependencias de `npm` e GitHub Actions.
- Arquivo `.github/CODEOWNERS` com dono do codigo para exigencia de revisao.

### Objetivo
- Impedir merge direto em `main` sem aprovacao e sem passar nas verificacoes automatizadas de qualidade e seguranca.

## 2026-08-04 - Visao financeira por funcionario
### Adicionado
- Resumo de faturamento total e comissao total na tela financeira.
- Listagem de faturamento por funcionario com base nos pagamentos concluidos.
- Exibicao do valor faturado, total de comissao e quantidade de pagamentos por funcionario.

### Alterado
- Tela `Financeiro` agora mostra a visao consolidada antes da lista de pagamentos.

## 2026-07-04 - Etapa 1
### Adicionado
- Projeto Next.js com App Router, TypeScript e TailwindCSS.
- shadcn/ui inicializado com preset Nova.
- Dependencias do Supabase instaladas (`@supabase/supabase-js` e `@supabase/ssr`).
- Estrutura obrigatoria de pastas: `docs`, `docs/prompts`, `docs/database`, `src`.
- Tela inicial de login em `/login` com validacao, loading e tratamento de erro.
- Clientes Supabase para browser e server em `src/lib/supabase`.
- Rota de teste em `/api/test-supabase` para validar conexao com Auth e PostgREST.
- Arquivo `.env.example` com variaveis obrigatorias.
- Documentacao inicial: `roadmap.md`, `rules.md`, `database.md` e `changelog.md`.

### Alterado
- Rota raiz `/` agora redireciona para `/login`.
- Metadados da aplicacao atualizados para o contexto SaaS Barbearias.
- Rota `/api/test-supabase` ajustada para evitar falso negativo quando o endpoint raiz do PostgREST retorna 404.

### Observacoes
- Esquema SQL e politicas RLS ainda nao foram implementados nesta etapa.

## 2026-07-04 - Etapa 2
### Adicionado
- Fluxo real de autenticacao no formulario com modos de login, cadastro e recuperacao.
- Pagina de atualizacao de senha em `/auth/atualizar-senha`.
- Rota protegida de validacao em `/painel`.
- Middleware de autenticacao para proteger rotas e redirecionar usuarios.

### Alterado
- Formulario de login conectado ao Supabase Auth com mensagens de erro e sucesso em portugues.
- Login agora respeita parametro de retorno (`next`) ao acessar rotas protegidas.

### Observacoes
- Confirmacao de e-mail depende da configuracao do projeto Supabase Auth.

## 2026-07-04 - Ajuste local de ambiente
### Alterado
- Tela de login nao quebra mais quando variaveis de ambiente do Supabase estao ausentes; o erro agora aparece de forma tratada ao tentar autenticar.
- Middleware de autenticacao ganhou fallback para nao derrubar a aplicacao inteira em ambiente local sem `.env.local` configurado.
- Correcao da `NEXT_PUBLIC_SUPABASE_URL` para usar apenas o dominio base do projeto (sem `/rest/v1`), restaurando login e cadastro.
- Validacao no `getSupabaseEnv` para impedir URL com sufixos incorretos (`/rest/v1` e `/auth/v1`).
- Leitura das variaveis `NEXT_PUBLIC_*` alterada para acesso estatico em `process.env`, corrigindo indisponibilidade no client-side do Next.js.

### Adicionado
- Criacao orientada do arquivo `.env.local` a partir do `.env.example`.

## 2026-07-04 - Etapa 3
### Adicionado
- Script SQL inicial da modelagem multi-tenant com tabelas obrigatorias em `docs/database/001_etapa3_schema_rls.sql`.
- Guia de execucao da etapa em `docs/database/etapa3_como_executar.md`.
- Funcao `current_company_id()` para suportar filtros de tenant nas policies.
- Politicas RLS para isolamento por empresa em `companies`, `profiles`, `employees`, `services`, `appointments` e `payments`.

### Alterado
- Documentacao de banco atualizada para refletir o status da Etapa 3.
- Roadmap atualizado com Etapa 3 concluida e proxima etapa proposta.

### Observacoes
- O SQL desta etapa foi preparado e documentado; a aplicacao no banco deve ser feita no Supabase SQL Editor.
- Ajuste aplicado no script: funcao `current_company_id()` movida para depois da criacao da tabela `profiles` para evitar erro `relation does not exist`.

## 2026-07-04 - Etapa 4
### Adicionado
- Rota de onboarding em `/onboarding` para bootstrap do primeiro acesso.
- Action server-side para criar empresa inicial e perfil admin vinculado ao usuario autenticado.
- Formulario de onboarding com validacao e estado de carregamento.

### Alterado
- Rota `/painel` agora redireciona para `/onboarding` quando o usuario ainda nao possui empresa/perfil.
- Middleware atualizado para tratar `/onboarding` como rota protegida.

### Observacoes
- O bootstrap depende do script SQL da Etapa 3 ja aplicado no Supabase (tabelas e policies).

## 2026-07-04 - Correcao onboarding
### Alterado
- Ajuste no arquivo `src/app/onboarding/actions.ts` para obedecer a regra do Next.js em `use server` (somente funcoes async podem ser exportadas em runtime).
- Estado inicial do formulario de onboarding movido para `src/components/onboarding/onboarding-form.tsx`.
- Bootstrap da empresa ajustado para inserir `companies` sem `select` de retorno, evitando conflito com RLS no primeiro cadastro.

### Observacoes
- Erro corrigido: `A "use server" file can only export async functions, found object.` ao finalizar cadastro da empresa.

## 2026-07-04 - Etapa 5
### Adicionado
- CRUD de funcionarios em `/painel/funcionarios` com create, update e delete.
- CRUD de servicos em `/painel/servicos` com create, update e delete.
- Componentes de formulario com loading state e feedback de sucesso/erro.

### Alterado
- Painel principal ganhou links para os modulos de funcionarios e servicos.

### Observacoes
- Todas as operacoes usam sessao autenticada e `company_id` para manter isolamento multi-tenant com RLS.

## 2026-07-04 - Melhoria UX servicos
### Alterado
- Feedback de criacao/erro de servicos trocado de mensagem fixa para notificacao temporaria no topo da tela.
- Formulario de novo servico agora limpa automaticamente os campos apos criacao com sucesso.

## 2026-07-04 - Melhoria UX funcionarios
### Alterado
- Feedback de criacao/erro de funcionarios trocado de mensagem fixa para notificacao no topo da tela, seguindo o mesmo padrao visual do modulo de servicos.

## 2026-07-04 - Padronizacao de feedback em lista
### Alterado
- Formularios de edicao e exclusao dos itens em funcionarios e servicos agora usam notificacao no topo do card, removendo mensagens fixas ao lado dos botoes.

## 2026-07-04 - Etapa 6
### Adicionado
- CRUD de agendamentos em `/painel/agendamentos` com create, update e delete.
- Vinculacao obrigatoria de agendamento com funcionario e servico da mesma empresa.
- Validacoes de status, data/hora e referencias de funcionario/servico.
- Componentes de formulario com loading state e notificacoes de feedback.

### Alterado
- Painel principal recebeu acesso ao modulo de agendamentos.

### Observacoes
- O modulo de agendamentos depende de funcionarios e servicos ativos para novos cadastros.

## 2026-07-04 - Correcao critica de conflito em agendamentos
### Adicionado
- Script `docs/database/002_etapa6_conflito_agendamentos.sql` com campo `data_hora_fim`, indices e constraint de sobreposicao.
- Documento `docs/database/etapa6_testes_basicos.md` com cenarios de validacao.

### Alterado
- Backend de agendamentos agora calcula `data_hora_fim` automaticamente com base na duracao do servico.
- Backend bloqueia conflitos para o mesmo funcionario quando status for `agendado`.
- Frontend de criacao e edicao de agendamento ganhou validacao previa de conflito para feedback imediato.

### Regras de conflito aplicadas
- Conflito quando: `novo_inicio < existente_fim` e `novo_fim > existente_inicio`.
- Agendamentos `cancelado` nao entram no bloqueio de conflito.

## 2026-07-04 - Correcao de inicializacao
### Alterado
- Ajuste em `src/lib/supabase/server.ts` para evitar tentativa invalida de escrita de cookies em Server Components no Next.js.

### Observacoes
- Erro corrigido: `Cookies can only be modified in a Server Action or Route Handler`.

## 2026-07-04 - Etapa 7
### Adicionado
- CRUD de pagamentos em `/painel/financeiro` com create, update e delete.
- Formulario de criacao com selecao de agendamentos concluidos sem pagamento.
- Validacoes de seguranca no backend para bloquear pagamento fora da empresa, agendamento nao concluido e duplicidade por agendamento.
- Calculo automatico de `valor_comissao` com base em `valor` e `percentual_comissao`.

### Alterado
- Painel principal recebeu acesso ao modulo de financeiro.
- Feedback de sucesso/erro no modulo financeiro segue o padrao de notificacao temporaria usado nos outros modulos.

### Observacoes
- O modulo de financeiro reutiliza o isolamento multi-tenant por `company_id` com RLS.

## 2026-07-04 - Etapa 8
### Adicionado
- Dashboard inicial em `/painel` com bloco de Agenda do dia.
- Contadores visuais de agendamentos do dia por status (agendado, concluido, cancelado).
- Lista dos proximos atendimentos pendentes do dia no topo do painel.
- Indicador de faturamento do dia com base em pagamentos registrados no dia.
- Ranking de servicos mais vendidos no mes atual com base em agendamentos concluidos.

### Alterado
- Layout do painel evoluido de tela de validacao para visao de acompanhamento operacional.

### Observacoes
- Etapa 8 concluida com dashboard operacional inicial no painel principal.

## 2026-07-04 - Etapa 9
### Adicionado
- Modulo de relatorios em `/painel/relatorios` com filtro de periodo.
- Endpoint `/api/reports/appointments` para exportacao CSV de agendamentos.
- Endpoint `/api/reports/payments` para exportacao CSV de financeiro.
- Endpoint `/api/reports/appointments/pdf` para exportacao PDF de agendamentos.
- Endpoint `/api/reports/payments/pdf` para exportacao PDF de financeiro.
- Utilitario `src/lib/reports/pdf.ts` para geracao padronizada de PDFs.
- Links de exportacao no painel principal para acesso rapido ao modulo.

### Regras aplicadas
- Exportacao protegida por autenticacao e escopo de empresa (`company_id`).
- CSV gerado com colunas de referencia (cliente, servico, funcionario e comissao).
- PDF gerado no backend com periodo e total de registros, preservando escopo por empresa.

### Observacoes
- Etapa 9 concluida com exportacao em CSV e PDF para agendamentos e financeiro.

## 2026-07-04 - Etapa 10
### Adicionado
- Utilitario de acesso em `src/lib/auth/access.ts` para resolver papel do usuario e permissoes por modulo.
- Exibicao do papel atual no painel (`Administrador` ou `Equipe`).
- Modulo `/painel/equipe` para gestao de papeis dos membros da empresa.
- Action de troca de papel com regra de seguranca para manter ao menos um admin.

### Alterado
- Modulos `funcionarios`, `servicos` e `financeiro` agora exigem papel `admin` na renderizacao das paginas.
- Server actions desses modulos agora validam permissao de admin antes de criar/editar/excluir.
- Painel principal oculta links de modulos restritos para usuarios de equipe.
- Agendamentos agora usam permissao granular: equipe pode criar/editar, mas nao pode excluir.

### Observacoes
- Etapa 10 concluida com controle de acesso por papel, regra granular por operacao e gestao de papeis da equipe.

## 2026-07-04 - Etapa 11
### Adicionado
- Convites por e-mail no modulo de equipe (criar, listar e revogar) para administradores.
- Script `docs/database/003_etapa11_convites_auditoria.sql` com tabelas `team_invites` e `audit_logs`.
- Registro de eventos sensiveis da equipe em `audit_logs` (melhor esforco, sem bloquear fluxo principal).
- Fluxo de aceite de convite por token em `/convites/[token]`.
- Tela de auditoria em `/painel/auditoria` para administradores.
- Policies de convite ajustadas para permitir leitura/aceite pelo e-mail convidado autenticado.

### Alterado
- Pagina de equipe evoluiu para "Equipe, convites e papeis" com secao dedicada de convites.
- Acoes de agendamento agora seguem permissao granular por operacao (`create`, `update`, `delete`).
- Painel principal recebeu atalho para trilhas de auditoria (admin).

### Observacoes
- Se voce ja executou uma versao anterior do SQL da Etapa 11, reexecute `003_etapa11_convites_auditoria.sql` para aplicar as policies novas de aceite por token.
- Etapa 11 concluida com convites por token e trilha de auditoria no painel.

## 2026-07-04 - Etapa 12
### Adicionado
- Filtros avancados na tela de auditoria por periodo, acao, entidade e busca textual.
- Contador de resultados filtrados e acao de limpar filtros.
- Endpoint `/api/reports/auditoria` para exportacao CSV da auditoria com filtros.
- Endpoint `/api/reports/auditoria/pdf` para exportacao PDF da auditoria com filtros.
- Botoes de exportacao CSV/PDF na pagina de auditoria reaproveitando os filtros ativos.
- Script `docs/database/004_etapa12_notificacoes.sql` com tabela `security_notifications` e policies RLS.
- Automacao de notificacao para eventos sensiveis de equipe/convites.
- Caixa de notificacoes em `/painel/notificacoes` com filtro de nao lidas.
- Acoes para marcar notificacao individual ou todas como lidas.
- Atalho no dashboard para notificacoes sensiveis.

### Alterado
- Consulta da auditoria passou a respeitar filtros server-side para periodo, acao e entidade.
- Fluxos de equipe e aceite de convite agora disparam notificacoes para administradores, sem bloquear fluxo principal.

### Observacoes
- Etapa 12 concluida com filtros/exportacao de auditoria e automacoes de notificacao para eventos sensiveis.

## 2026-07-04 - Etapa 13 (inicio)
### Adicionado
- Script `docs/database/005_etapa13_clientes.sql` com tabela `customers`, indices e policies RLS.
- Modulo `/painel/clientes` com CRUD inicial (criar, listar, editar e excluir clientes).
- Componentes de formulario para cadastro e manutencao de clientes.
- Atalho no dashboard para gerenciamento de clientes.
- Script `docs/database/006_etapa13_agendamentos_clientes.sql` para vincular agendamentos a clientes por `customer_id`.
- Selecao de cliente cadastrado no create/update de agendamentos (vinculo opcional).
- Tela de historico por cliente em `/painel/clientes/[id]` com linha do tempo de atendimentos e pagamentos.
- Atalho "Ver historico" em cada item do modulo de clientes.

### Observacoes
- Etapa 13 concluida com cadastro de clientes, integracao a agendamentos e historico de atendimentos por cliente.
