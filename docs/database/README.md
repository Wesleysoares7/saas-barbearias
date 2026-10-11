# Database

Esta pasta guarda materiais de banco de dados, incluindo scripts SQL e politicas RLS nas proximas etapas.

## Arquivos atuais

- `001_etapa3_schema_rls.sql`: modelagem inicial do banco com RLS multi-tenant.
- `etapa3_como_executar.md`: guia de execucao do script no Supabase SQL Editor.
- `002_etapa6_conflito_agendamentos.sql`: reforco de agendamentos com `data_hora_fim` e bloqueio de sobreposicao por funcionario.
- `etapa6_testes_basicos.md`: roteiro de validacao dos cenarios de conflito.
- `003_etapa11_convites_auditoria.sql`: tabelas e policies para convites e trilha de auditoria.
- `004_etapa12_notificacoes.sql`: tabela e policies para notificacoes de eventos sensiveis.
- `005_etapa13_clientes.sql`: tabela e policies para cadastro de clientes.
- `006_etapa13_agendamentos_clientes.sql`: vinculo opcional de agendamento com cliente cadastrado.
- `007_etapa14_logo_empresa_storage.sql`: bucket e policies para logo da empresa.
- `008_etapa15_agendamento_publico.sql`: configuracoes e policies para agendamento publico.
- `009_etapa16_master_plataforma.sql`: acesso master global para visao de empresas.
- `010_fix_grants_authenticated.sql`: correcao de permissoes (GRANT) para o role `authenticated` nas tabelas do schema `public`. Necessario ao criar o banco do zero via SQL Editor (o GRANT padrao do Supabase para novas tabelas nao e herdado quando a tabela e criada manualmente como `postgres`); sem ele ocorre o erro `permission denied for table profiles` (ou outra tabela) mesmo com as policies de RLS corretas.
- `012_etapa_comissao_opcional.sql`: remove a obrigatoriedade (NOT NULL/default) da coluna `percentual_comissao` em `employees`, permitindo cadastrar funcionario sem definir comissao (ex.: administrador que atua como atendente unico).
- `013_etapa_funcionario_admin.sql`: adiciona `user_id` (vinculo com `auth.users`) e `email` em `employees`, permitindo detectar se o administrador logado ja possui registro de funcionario e copiar seus dados com um clique.
- `014_etapa_almoxarifado_estoque.sql`: cria `products` e `stock_movements` (estoque do salao). Saldo (`quantidade_atual`) e `custo_medio` sao mantidos apenas por trigger; movimentacoes sao imutaveis e o acesso e restrito a admin via RLS.
- `016_etapa_caixa_saldo_lancamentos.sql`: cria `cash_entries` (saldo inicial e lancamentos avulsos de entrada/despesa, restrito a admin via RLS) e a funcao `finance_summary` usada no Resumo do periodo do Financeiro.
- `015_etapa_hardening_permissoes.sql`: triggers e policies que impedem funcionario de virar admin, criacao de perfil em empresa alheia e escrita de funcionarios/servicos por nao-admin.
- `017_etapa_clientes_vinculo_agendamentos.sql`: vinculo de clientes com agendamentos.
- `018_etapa_onboarding_atomico.sql`: funcao `create_company_with_admin` (empresa + perfil admin + atendente numa transacao).
- `019_etapa_fechar_criacao_direta.sql`: remove INSERT direto em `companies` e a criacao de admin sem convite.
