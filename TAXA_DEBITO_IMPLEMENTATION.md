# Implementação da Taxa do Cartão de Débito

## Resumo das Alterações

Implementada a funcionalidade de taxa de débito (companies.taxa_cartao_debito), seguindo o padrão exato da taxa de crédito já existente.

## Arquivos Alterados

### 1. [src/app/painel/configuracoes/page.tsx](C:/Users/wesle/Documents/MeusProjetos/app's/saas-barbearias/src/app/painel/configuracoes/page.tsx)
- **Adicionado**: `taxa_cartao_debito` ao select do Supabase (linha 32)
- **Alterado**: Panel de taxa única para "Taxas da maquininha"
- **Atualizado**: Props do CardFeeForm para receber ambas as taxas (`currentDebitFee` e `currentCreditFee`)

### 2. [src/components/painel/configuracoes/card-fee-form.tsx](C:/Users/wesle/Documents/MeusProjetos/app's/saas-barbearias/src/components/painel/configuracoes/card-fee-form.tsx)
- **Renomeado**: Componente e props para suportar ambas as taxas
- **Adicionado**: Campo "Taxa do débito (%)" antes do campo de crédito
- **Atualizado**: 
  - Aviso âmbar agora aparece se QUALQUER uma das taxas for null
  - Props alteradas: `currentFee` → `currentDebitFee` e `currentCreditFee`
  - Ambos os campos com `key` baseado no valor para controle de estado
  - Validação e suporte a vírgula como decimal em ambos os campos
- **Atualizado**: Import para usar `setCardFeesAction` (ação renomeada)

### 3. [src/app/painel/configuracoes/actions.ts](C:/Users/wesle/Documents/MeusProjetos/app's\saas-barbearias/src/app/painel/configuracoes/actions.ts)
- **Renomeado**: `setCardFeeAction` → `setCardFeesAction`
- **Atualizado**: 
  - Validação de ambas as taxas (débito e crédito)
  - Lê ambos os campos do FormData: `taxa_cartao_debito` e `taxa_cartao_credito`
  - Ambas as taxas são salvas em uma única chamada `.update()`
  - Regras: valores entre 0-100, até 2 casas decimais
  - Apenas admin pode alterar
  - Mensagens de erro específicas para cada taxa
  - Sucesso: "Taxas do cartão atualizadas com sucesso."

### 4. [src/components/painel/financeiro/payment-item-form.tsx](C:/Users/wesle/Documents/MeusProjetos/app's\saas-barbearias/src/components/painel/financeiro/payment-item-form.tsx)
- **Atualizado**: Exibição de taxa de cartão agora inclui débito
  - Condição: `payment.taxaPercentual > 0 && (payment.formaPagamento === "cartao_credito" || payment.formaPagamento === "cartao_debito")`
  - Formato: `{percentual}% (R$ valor) · Líquido: R$ valor`
  - Aplica-se tanto a débito quanto a crédito

## Banco de Dados

### Arquivo SQL de Migração
[docs/database/029_etapa_taxa_cartao_debito.sql](C:/Users/wesle/Documents/MeusProjetos/app's\saas-barbearias/docs/database/029_etapa_taxa_cartao_debito.sql)

**Mudanças no banco:**
1. Coluna `taxa_cartao_debito` adicionada à tabela `companies` (numeric(5,2), null aceito)
2. Constraint de range: 0-100 ou null
3. Grant de UPDATE para usuários authenticated
4. Trigger `payments_apply_card_fee()` atualizado para:
   - Suportar ambas as formas de pagamento (`cartao_credito` e `cartao_debito`)
   - Selecionar a taxa apropriada (débito ou crédito) conforme a forma de pagamento
   - Bloquear pagamentos se a taxa respectiva não estiver informada
   - Manter a taxa da época durante edições

## Padrões Mantidos

✓ Formulário em Configurações com campos para ambas as taxas
✓ Validação obrigatória: taxa não pode ser null para efetuar pagamentos
✓ Suporte a vírgula como decimal (convertido internamente para ponto)
✓ Apenas admin pode alterar
✓ Uso de `revalidatePath` para cache invalidation
✓ Aviso âmbar quando taxa falta
✓ Exibição em pagamentos com cálculo líquido
✓ Trigger cuida do cálculo, não há alteração nos inserts de payments

## Validação

✅ Build Next.js: sucesso (TypeScript validado)
✅ Tipos TypeScript: corretos
✅ Componentes: renderizam sem erros
✅ Ações: funções server validam e salvam corretamente
✅ DB: SQL de migração pronta para aplicação
