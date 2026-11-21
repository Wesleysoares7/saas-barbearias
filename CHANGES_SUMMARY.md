# Resumo de Mudanças - Trial Vencido com Estado "Limited"

## Visão Geral

Implementado novo comportamento para trial vencido onde a conta entra em estado "limited" (limitado) em vez de ser completamente bloqueada. Usuários em estado limited podem acessar apenas páginas específicas para contratar um plano ou exportar dados.

## Fluxo de Acesso

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Usuário acessa o painel                         │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │  getAccessContext() chamado  │
            └──────────┬───────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   blocked=true   limited=true   blocked=false
   (suspended,                   limited=false
    canceled)                    (ativo, trial
                                 vigente, etc)
        │              │              │
        ▼              ▼              ▼
   Bloqueia      Se allowLimited    Acesso
   totalmente    não permitir:       livre
                 Redireciona
                 para /painel/plano
```

## Arquivos Modificados

### 1. Core Billing Logic
- **`src/lib/billing/state.ts`**
  - ✅ Adicionado `limited: boolean` ao `BillingState`
  - ✅ Atualizado `resolveBillingState()` para trial vencido ter `limited: true, blocked: false`
  - ✅ Mantém `blockReason: "trial_expired"` para compatibilidade

- **`src/lib/billing/labels.ts`**
  - ✅ Atualizado `billingPill()` para verificar `limited` antes de `blocked`
  - ✅ Exibe "Teste encerrado" (warning tone) quando `limited: true`

### 2. Authentication & Access Control
- **`src/lib/auth/access.ts`**
  - ✅ Adicionado `/painel/plano` como possível redirect
  - ✅ `getAccessContext()` agora aceita `options?: { allowLimited?: boolean }`
  - ✅ Quando `limited: true` e `!allowLimited`: retorna erro e redireciona
  - ✅ Mantém plataform admins imunes ao estado limited

### 3. UI & Layout
- **`src/app/painel/layout.tsx`**
  - ✅ Chamada: `getAccessContext({ allowLimited: true })`
  - ✅ Menu filtrado em estado limited: apenas "Configurações" e "Plano"
  - ✅ Banner âmbar sticky com mensagem de trial encerrado
  - ✅ Notificações desabilitadas em estado limited

### 4. Plan/Subscription Pages
- **`src/app/painel/plano/page.tsx`**
  - ✅ Chamada: `getAccessContext({ allowLimited: true })`
  - ✅ Adicionado painel "Exportar dados" para admin
  - ✅ Link para `/api/account/export`

- **`src/app/painel/plano/actions.ts`**
  - ✅ Chamada: `getAccessContext({ allowLimited: true })`
  - ✅ Removida importação não usada

### 5. Settings/Configuration Pages
- **`src/app/painel/configuracoes/page.tsx`**
  - ✅ Chamada: `getAccessContext({ allowLimited: true })`

- **`src/app/painel/configuracoes/actions.ts`**
  - ✅ Atualizado `getAdminScope()`: `getAccessContext({ allowLimited: true })`
  - ✅ Atualizado `setThemeAction()`: `getAccessContext({ allowLimited: true })`
  - ✅ Atualizado `setCompanyInfoAction()`: `getAccessContext({ allowLimited: true })`

## Comportamentos por Estado

### Trial Ativo (dias > 0)
```
blocked: false
limited: false
blockReason: null
banner: "trial" ou "trial_ending"
✅ Acesso completo ao painel
✅ Menu com todas as opções
```

### Trial Vencido (dias = 0, data passada)
```
blocked: false         ← NOVO (antes era true)
limited: true          ← NOVO
blockReason: "trial_expired"
banner: null           ← NOVO (antes teria redirecionado)
✅ Acesso limitado ao layout
✅ Menu apenas: Configurações, Plano
✅ Banner fixo com aviso
✅ Pode exportar dados (se admin)
❌ Não pode acessar outras páginas
```

### Conta Suspensa
```
blocked: true
limited: false
blockReason: "suspended"
banner: null
❌ Bloqueio total
❌ Redireciona para /conta-suspensa
```

### Conta Cancelada
```
blocked: true
limited: false
blockReason: "canceled"
banner: null
❌ Bloqueio total
❌ Redireciona para /conta-suspensa
```

## Redirecionamentos Implementados

| Rota | Sem Permissão | Com Limited | Com Blocked |
|------|---------------|-------------|------------|
| `/painel` | `/login` | Redireciona para `/painel/plano` | `/conta-suspensa` |
| `/painel/agendamentos` | `/login` | Redireciona para `/painel/plano` | `/conta-suspensa` |
| `/painel/plano` | `/login` | ✅ Acesso permitido | Pode acessar* |
| `/painel/configuracoes` | `/login` | ✅ Acesso permitido | Pode acessar* |
| `/conta-suspensa` | `/login` | ✅ Nunca aparece (limited ≠ blocked) | ✅ Aparece |

*Com `allowLimited: true` na função

## Validação de Build

✅ **Build**: `npm run build` - Success
✅ **Lint**: `npm run lint` - No errors
✅ **TypeScript**: Compilação sem erros

## Impacto no Usuário

### Antes
1. Trial vence
2. Conta é bloqueada completamente
3. Usuário redirecionado para `/conta-suspensa`
4. Sem opção de continuar usando

### Depois
1. Trial vence
2. Conta entra em estado "limited"
3. Usuário pode acessar layout do painel
4. Menu mostra apenas "Configurações" e "Plano"
5. Banner amarelo fixo avisa: "Seu período de teste terminou. Assine um plano para voltar a usar o sistema."
6. Usuário pode clicar "Ver planos" para contratar
7. Se admin, pode exportar dados em `/painel/plano`

## Considerações de Segurança

✅ Platform admins não são afetados pelo estado limited
✅ Nenhuma mudança em contas suspended/canceled
✅ Validação ocorre em tempo de requisição, não cliente
✅ Não há bypass - sem `allowLimited: true`, o acesso é negado
✅ Redirecionamento seguro para `/painel/plano` com mensagem clara

## Próximos Passos (Futuro)

- [ ] Implementar endpoint `/api/account/export` (referenciado mas não criado)
- [ ] Adicionar testes de integração para estado limited
- [ ] Considerar email de aviso antes do trial vencer
- [ ] Dashboard administrativo para gerenciar planos limitados
