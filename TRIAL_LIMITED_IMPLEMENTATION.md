# Implementação do Estado "Limited" para Trial Vencido

## Resumo das Mudanças

Este documento descreve a implementação do novo comportamento para trial vencido. Anteriormente, quando o trial vencia, a conta era totalmente bloqueada e redirecionada para `/conta-suspensa`. Agora, o trial vencido passa a um estado "limited" (limitado) onde o usuário pode acessar apenas páginas específicas para contratar um plano ou exportar dados.

## Comportamento

### Estados de Cobrança (Billing States)

- **`blocked: true`**: Apenas para "suspended" e "canceled" - bloqueio total
- **`limited: true`**: Para trial vencido - acesso limitado
- **Banner**: Nenhum banner para trial vencido (apenas mensagem fixa no header quando em estado limited)

## Arquivos Alterados

### 1. `src/lib/billing/state.ts`

**Mudanças:**
- Adicionado campo `limited: boolean` ao tipo `BillingState`
- Quando o trial vence (`status: "trial"` e data de término passada):
  - `limited: true` (novo)
  - `blocked: false` (mudança de `true` para `false`)
  - `blockReason: "trial_expired"` (mantém o mesmo)
  - `banner: null` (mudança de não ter banner)
  - `trialDaysLeft: 0`

### 2. `src/lib/billing/labels.ts`

**Mudanças:**
- Verificar `limited` antes de `blocked` na função `billingPill()`
- Quando `limited: true`, retorna `{ tone: "warning", label: "Teste encerrado" }`
- Mantém compatibilidade com estado anterior (mostrar "Teste encerrado" quando blocked e trial_expired)

### 3. `src/lib/auth/access.ts`

**Mudanças:**
- Adicionado `/painel/plano` como possível `redirectTo` no tipo `AccessContext`
- Função `getAccessContext()` agora aceita opções: `getAccessContext(options?: { allowLimited?: boolean })`
- Quando `billing.limited` e `!options?.allowLimited` e NÃO é platform admin:
  - Retorna `companyId: null`, `role: null`
  - Mensagem de erro: "Seu período de teste terminou. Assine um plano para voltar a usar esta função."
  - Redireciona para: `/painel/plano`
- Com `allowLimited: true`, o fluxo continua normalmente

### 4. `src/app/painel/layout.tsx`

**Mudanças:**
- Chamada: `getAccessContext({ allowLimited: true })`
- Quando em estado `limited`:
  - Menu (sidebar e mobile) mostra apenas:
    - "Configurações"
    - "Plano"
  - Banner âmbar fixo (sticky) com mensagem: "Seu período de teste terminou. Assine um plano para voltar a usar o sistema."
  - Link "Ver planos" no banner
  - Notificações desabilitadas (`showNotifications={isAdmin && !isLimited}`)

### 5. `src/app/painel/plano/page.tsx`

**Mudanças:**
- Chamada: `getAccessContext({ allowLimited: true })`
- Para admin, adiciona uma nova seção com:
  - Título: "Exportar dados"
  - Link: `/api/account/export`
  - Ícone: Download

### 6. `src/app/painel/plano/actions.ts`

**Mudanças:**
- Chamada: `getAccessContext({ allowLimited: true })`

### 7. `src/app/painel/configuracoes/page.tsx`

**Mudanças:**
- Chamada: `getAccessContext({ allowLimited: true })`

### 8. `src/app/painel/configuracoes/actions.ts`

**Mudanças:**
- Todas as chamadas de `getAccessContext()` agora recebem `{ allowLimited: true }`
- Funções alteradas:
  - `getAdminScope()`
  - `setThemeAction()`
  - `setCompanyInfoAction()`

## Fluxo de Acesso

### Sem `allowLimited: true` (padrão)

1. Usuário tenta acessar qualquer página do painel
2. `getAccessContext()` é chamado sem options
3. Se `billing.limited === true`:
   - Retorna `companyId: null`, `role: null`
   - Redireciona para `/painel/plano`

### Com `allowLimited: true`

1. Usuário acessa layout ou páginas específicas
2. `getAccessContext({ allowLimited: true })` é chamado
3. Se `billing.limited === true`:
   - Continua normalmente
   - Menu é filtrado para mostrar apenas "Configurações" e "Plano"
   - Banner fixo é exibido

## Páginas com `allowLimited: true`

- `/painel/layout.tsx` (layout principal)
- `/painel/plano/page.tsx` (contratação de plano)
- `/painel/plano/actions.ts` (ações do plano)
- `/painel/configuracoes/page.tsx` (configurações)
- `/painel/configuracoes/actions.ts` (ações de configurações)

## Páginas SEM `allowLimited: true` (mantém bloqueio anterior)

Todas as outras páginas continuam bloqueando acesso limitado:
- Dashboard (`/painel`)
- Agendamentos
- Relatórios
- Clientes
- Funcionários
- Serviços
- Estoque
- Financeiro
- Equipe
- Auditoria
- Notificações
- Minha Comissão

## Estado "Suspended" e "Canceled"

Mantém comportamento anterior - completamente bloqueado:
- `blocked: true`, `limited: false`
- Redireciona para `/conta-suspensa`
- Nenhuma mudança nesse fluxo

## Testes Realizados

✅ Build successfully compiled
✅ ESLint validation passed
✅ TypeScript type checking passed
✅ No console errors during development

## Notas Importantes

1. O arquivo `/conta-suspensa` não foi alterado - mantém seu comportamento original
2. O banner é "sticky" (fixo) apenas quando `limited: true`
3. O link "Exportar meus dados" é uma adição futura - usa rota `/api/account/export`
4. Platform admins (modo suporte) NÃO são afetados pelo estado limited
