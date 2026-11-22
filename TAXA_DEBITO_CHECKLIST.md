# Checklist de Implementação - Taxa do Cartão de Débito

## ✅ Implementação Concluída

### 1. Banco de Dados
- ✅ Coluna `taxa_cartao_debito` criada em `companies`
- ✅ Constraint de range (0-100 ou null)
- ✅ Grant de UPDATE para usuários authenticated
- ✅ Trigger `payments_apply_card_fee()` atualizado para suportar débito
- ✅ Arquivo: `docs/database/029_etapa_taxa_cartao_debito.sql`

### 2. Página de Configurações
- ✅ Select Supabase inclui `taxa_cartao_debito`
- ✅ Tipo do `company` incluído
- ✅ Panel renomeado para "Taxas da maquininha"
- ✅ CardFeeForm recebe ambas as taxas como props
- ✅ Arquivo: `src/app/painel/configuracoes/page.tsx`

### 3. Formulário de Taxa
- ✅ Campo "Taxa do débito (%)" adicionado ANTES do campo de crédito
- ✅ Ambos os campos com `key` para controle de estado
- ✅ Aviso âmbar aparece se QUALQUER taxa for null
- ✅ Suporte a vírgula como decimal em ambos os campos
- ✅ Validação: 0-100, até 2 casas decimais
- ✅ Arquivo: `src/components/painel/configuracoes/card-fee-form.tsx`

### 4. Action de Salvamento
- ✅ Renomeada: `setCardFeeAction` → `setCardFeesAction`
- ✅ Lê ambos os campos: `taxa_cartao_debito` e `taxa_cartao_credito`
- ✅ Validação individual para cada taxa
- ✅ Ambas salvas em uma única chamada `.update()`
- ✅ Apenas admin pode alterar
- ✅ `revalidatePath` mantido
- ✅ Arquivo: `src/app/painel/configuracoes/actions.ts`

### 5. Exibição de Taxas em Pagamentos
- ✅ Condição: detecta débito e crédito
- ✅ Exibe apenas se `taxaPercentual > 0`
- ✅ Formato: `{percentual}% (R$ valor) · Líquido: R$ valor`
- ✅ Aplica-se tanto a débito quanto a crédito
- ✅ Arquivo: `src/components/painel/financeiro/payment-item-form.tsx`

### 6. Validação
- ✅ Build TypeScript: ✓ Sucesso
- ✅ ESLint: ✓ Sem erros
- ✅ Tipos importados corretamente
- ✅ Componentes renderizam sem erros
- ✅ Actions server-side validam corretamente

## 🔄 Fluxo de Uso

1. **Admin acessa Configurações**
   - Vê panel "Taxas da maquininha"
   - Se qualquer taxa for null, vê aviso âmbar
   - Preenche/edita ambas as taxas (débito e crédito)
   - Clica "Salvar taxas"
   - Action `setCardFeesAction` valida e salva ambas

2. **Pagamentos com Cartão**
   - Débito: trigger usa `taxa_cartao_debito`
   - Crédito: trigger usa `taxa_cartao_credito`
   - Se taxa = null, pagamento é bloqueado (erro no trigger)
   - Se taxa > 0, exibe na lista: "Taxa do cartão: X% (R$Y) · Líquido: R$Z"

## 📋 Testes Manuais Recomendados

1. **Acesso à página de configurações**
   - Como admin, verificar se ambas as taxas aparecem
   - Verificar se aviso âmbar aparece quando alguma taxa é null

2. **Salvamento de taxas**
   - Preencher apenas débito (deve validar que crédito é obrigatório)
   - Preencher apenas crédito (deve validar que débito é obrigatório)
   - Preencher ambas com valores válidos
   - Verificar salvamento com sucesso
   - Recarregar página e confirmar persistência

3. **Entrada de pagamentos**
   - Registrar pagamento com débito e taxa > 0
   - Verificar se taxa aparece na lista de pagamentos
   - Registrar pagamento com crédito e taxa > 0
   - Verificar se taxa aparece na lista de pagamentos
   - Tentar registrar pagamento com débito/crédito sem taxa (deve bloquear)

4. **Edição de pagamentos**
   - Abrir dialog de edição
   - Verificar se taxa é exibida corretamente
   - Mudar forma de pagamento (débito ↔ crédito)
   - Verificar se taxa muda conforme a forma

## 🚀 Próximos Passos

1. Aplicar migration SQL 029 no Supabase: `docs/database/029_etapa_taxa_cartao_debito.sql`
2. Recarregar app no navegador (força atualização de cache)
3. Testar fluxo completo conforme "Testes Manuais"
4. Commit com mensagem:
   ```
   feat: add debit card fee (taxa_cartao_debito)
   
   - Add taxa_cartao_debito column to companies table
   - Update card fee form to show both debit and credit fees
   - Rename setCardFeeAction to setCardFeesAction
   - Update payments display to show debit fee when applicable
   - Update trigger payments_apply_card_fee to handle both payment types
   ```
