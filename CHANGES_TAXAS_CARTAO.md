# Resumo das Mudanças - Taxas de Cartão e Recebimentos por Forma de Pagamento

Data: 2026-11-22
Tarefa: Implementação de suporte a taxas de cartão no resumo financeiro

## Resumo Executivo
Implementação completa do suporte a taxas de cartão crédito e débito no resumo financeiro, com:
1. Correção de bug no cálculo de faturamento
2. Inclusão de taxas no extrato do período
3. Novo painel agrupado por forma de pagamento

---

## 1. Bug Corrigido: totalFaturamento
**Arquivo**: `src/app/painel/financeiro/page.tsx` (linha ~281)

**Problema**: 
`totalFaturamento` estava somando `payments` (todos os pagamentos do histórico) em vez de `filteredPayments` (apenas do período selecionado).

**Solução**:
```diff
- const totalFaturamento = roundToTwo(
-   payments.reduce((sum, payment) => sum + Number(payment.valor ?? 0), 0)
- );
+ const totalFaturamento = roundToTwo(
+   filteredPayments.reduce((sum, payment) => sum + Number(payment.valor ?? 0), 0)
+ );
```

**Impacto**: O indicador "Faturamento" agora mostra o valor correto do período filtrado.

---

## 2. Tipo FinanceSummary Atualizado
**Arquivo**: `src/types/cash.ts`

**Mudança**: Adicionado campo `taxas_cartao: number` ao tipo.

**Ordem dos campos (conforme função SQL `finance_summary` etapa 028+030)**:
```typescript
export type FinanceSummary = {
  saldo_inicial_valor: number | null;
  saldo_inicial_data: string | null;
  saldo_anterior: number;
  saldo_inicial_no_periodo: number;
  receitas: number;
  comissoes: number;
  taxas_cartao: number;              // ← NOVO (posição 7)
  compras_estoque: number;
  entradas_avulsas: number;
  despesas: number;
  consumo_estoque: number;
  saldo_final: number;
};
```

**Nota**: A ordem foi confirmada como correta de acordo com o arquivo de etapa SQL 028.

---

## 3. Linha de Taxas no Extrato
**Arquivo**: `src/app/painel/financeiro/page.tsx` (linha ~459-464)

**Mudança**: Adicionada linha "Taxas de cartao (-)" no array `statementLines` logo após "Comissoes (-)".

```typescript
{
  label: "Taxas de cartao (-)",
  value: formatCurrency(Number(summary.taxas_cartao)),
},
```

**Descrição do Panel Atualizada**:
```
"Saldo anterior + receitas + entradas - comissoes - taxas de cartao - compras - despesas = saldo final"
```

**Impacto**: O extrato do período agora mostra o desconto de taxas de cartão.

---

## 4. Novo Panel: Recebido por Forma de Pagamento
**Arquivo**: `src/app/painel/financeiro/page.tsx`

**Localização**: Aba "Resumo" (tab === "resumo"), logo após o Panel "Resumo do periodo"

**Funcionalidades**:

### Lógica de Agrupamento (linhas ~498-535)
1. Iterar sobre `filteredPayments`
2. Agrupar por `forma_pagamento`
3. Para cada grupo, calcular:
   - Quantidade de pagamentos
   - Total bruto (soma de `valor`)
   - Total de taxas (soma de `valor_taxa`)
   - Total líquido (bruto - taxas)

### Ordem de Exibição
- Ordem fixa: Pix → Dinheiro → Cartão crédito → Cartão débito
- Inclui "Outros" apenas se houver formas não reconhecidas em `PAYMENT_METHODS`

### Cards Exibidos
Para cada forma de pagamento:
- **Nome**: ex. "Pix", "Dinheiro", "Cartao credito", "Cartao debito"
- **Quantidade**: número de pagamentos
- **Total bruto**: valor total antes de taxas
- **[Apenas para cartão]**:
  - Taxa (-)
  - Líquido (bruto - taxa)

Última linha: **"Total Geral"** (deve ser igual ao indicador "Faturamento" superior)

### Layout
```
Grid de cards: grid-cols-2 md:grid-cols-4
Cada card: 
  - Classes: "min-h-14 min-w-0 rounded-xl border border-border bg-surface px-3 py-2"
  - Fonte: xs para labels, sm para valores
  - Responsive: 2 colunas mobile, 4 desktop
```

**Exemplo visual**:
```
┌─────────────┬─────────────┬──────────────┬──────────────┐
│ Pix         │ Dinheiro    │ Cartão crédito│ Cartão débito│
│ 5 pgs       │ 3 pgs       │ 2 pgs        │ 1 pg        │
│ R$ 500,00   │ R$ 300,00   │ R$ 100,00    │ R$ 50,00    │
│             │             │ Taxa: -R$ 2,00│ Taxa: -R$ 0,50
│             │             │ Líquido: R$ 98│ Líquido: R$ 49│
├─────────────┴─────────────┴──────────────┴──────────────┤
│ Total Geral: R$ 950,00                                  │
└───────────────────────────────────────────────────────┘
```

---

## 5. Importações Adicionadas
**Arquivo**: `src/app/painel/financeiro/page.tsx`

```typescript
import { PAYMENT_METHODS } from "@/lib/payment-methods";
```

Usada para:
- Mapear valores de `forma_pagamento` para labels legíveis
- Validar formas de pagamento conhecidas vs. "Outros"

---

## 6. Script SQL de Consolidação
**Arquivo**: `docs/database/030_etapa_consolidacao_taxas_cartao_credito_debito.sql`

**Propósito**: Atualizar `finance_summary()` para incluir `taxas_cartao` como campo de retorno.

**Mudanças**:
1. `DROP FUNCTION` da versão anterior
2. Recria função com `taxas_cartao` na posição 7
3. Soma `valor_taxa` de TODOS os pagamentos (crédito + débito)
4. Aplica desconto de taxas no cálculo de `saldo_final`

**CTE "ev"** (eventos):
- Adiciona linha `select ... 'taxa'::text, p.valor_taxa::numeric from public.payments p`
- Permite somar taxas de ambos os tipos de cartão

**Variável v_taxas**:
- Acumula `valor_taxa` de todos os pagamentos do período
- Descontada no saldo_final: `v_saldo_anterior + ... - v_comissoes - v_taxas - v_compras + ...`

---

## 7. Verificações Realizadas

### TypeScript/Build
- ✅ `npm run build` passou sem erros
- ✅ Tipos corretamente alinhados
- ✅ Sem warnings de tipos

### Lógica
- ✅ `totalFaturamento` usa `filteredPayments` (período correto)
- ✅ `totalComissao` já usava `filteredPayments` ✓
- ✅ Ordem de campos de `FinanceSummary` alinhada com SQL
- ✅ Agrupamento por forma de pagamento mantém ordem
- ✅ "Total Geral" deve ser igual a `totalFaturamento`

### Dependências
- ✅ Apenas `src/app/painel/financeiro/page.tsx` usa `finance_summary` (nenhum outro arquivo precisa ajuste)
- ✅ `PAYMENT_METHODS` importado corretamente
- ✅ Sem quebra de imports existentes

### UI/UX
- ✅ Grid layout usa classes dos indicadores (grid-cols-2 md:grid-cols-4)
- ✅ Cards mantêm visual consistente
- ✅ Taxas são exibidas apenas para cartão
- ✅ Texto de descrição atualizado corretamente

---

## 8. Dados Verificados

| Campo | Antes | Depois | Status |
|-------|-------|--------|--------|
| totalFaturamento | `payments` (histórico) | `filteredPayments` (período) | ✅ Corrigido |
| FinanceSummary | sem `taxas_cartao` | com `taxas_cartao` | ✅ Adicionado |
| statementLines | sem taxa | com linha "Taxas de cartao (-)" | ✅ Adicionado |
| Panel | sem agrupamento | novo Panel agrupado | ✅ Novo |
| saldo_final | sem desconto taxa | com desconto (- taxas_cartao) | ✅ Corrigido |

---

## 9. Próximos Passos (para o usuário)

1. **Executar SQL no Supabase**
   - Ir para SQL Editor
   - Executar `docs/database/030_etapa_consolidacao_taxas_cartao_credito_debito.sql`

2. **Testar na UI**
   - Acessar `/painel/financeiro`
   - Ir para aba "Resumo"
   - Verificar:
     - Indicador "Faturamento" = período filtrado (não histórico)
     - Panel "Resumo do periodo" mostra "Taxas de cartao (-)"
     - Novo Panel "Recebido por forma de pagamento" exibe corretamente
     - "Total Geral" = indicador "Faturamento"

3. **Validação**
   - Se há pagamentos em cartão crédito/débito:
     - Deve exibir Taxa e Líquido
     - Fórmula: Líquido = Bruto - Taxa
   - Se há formas não reconhecidas:
     - Deve aparecer em "Outros"
   - saldo_final deve descontar as taxas

---

## 10. Notas Importantes

- **Ordem de campos**: Crítica para evitar mismatch com retorno SQL. A ordem é:
  ```
  receitas, comissoes, taxas_cartao, compras_estoque, entradas_avulsas, despesas, consumo_estoque, saldo_final
  ```

- **filteredPayments**: Essencial para período correto. Baseado em `createdAt` entre `startDate` e `endDate`.

- **valor_taxa**: Apenas preenchido para cartão (crédito ou débito). Zero para outras formas.

- **Compatibilidade**: As etapas 028 (crédito) + 029 (débito) + 030 (consolidação) garantem suporte completo.
