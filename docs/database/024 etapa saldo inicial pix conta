-- Etapa 24: saldo inicial detalhado em Pix e Conta bancaria
-- Execute no Supabase SQL Editor APOS 001..023b e ANTES de publicar o app novo. Seguro para reexecucao.
--
-- Modelo:
--   cash_entries.valor        -> continua sendo o saldo inicial TOTAL (e o que a finance_summary usa).
--   cash_entries.valor_pix    -> quanto desse total estava no Pix.
--   cash_entries.valor_conta  -> quanto desse total estava em conta bancaria.
--   Dinheiro em caixa = valor - valor_pix - valor_conta (calculado no app, nao e gravado).
--
-- Por isso a finance_summary NAO muda e o saldo ja cadastrado continua valendo
-- (fica com Pix = 0 e Conta = 0, tudo considerado "em caixa").

alter table public.cash_entries
  add column if not exists valor_pix numeric(12,2) not null default 0,
  add column if not exists valor_conta numeric(12,2) not null default 0;

alter table public.cash_entries
  drop constraint if exists cash_entries_detalhe_saldo_check;

-- Pix e conta nao podem ser negativos e so existem no saldo inicial.
alter table public.cash_entries
  add constraint cash_entries_detalhe_saldo_check check (
    valor_pix >= 0
    and valor_conta >= 0
    and (tipo = 'saldo_inicial' or (valor_pix = 0 and valor_conta = 0))
  );

-- As colunas novas precisam entrar nos GRANTs por coluna (016 revogou o acesso geral).
grant insert (valor_pix, valor_conta) on public.cash_entries to authenticated;
grant update (valor_pix, valor_conta) on public.cash_entries to authenticated;

-- Conferencia:
--   select tipo, valor, valor_pix, valor_conta from public.cash_entries where tipo = 'saldo_inicial';