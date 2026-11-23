-- Etapa 33: forma de pagamento nos lancamentos do caixa + totais por forma
-- Execute no Supabase SQL Editor APOS 001..032. Seguro para reexecucao.
--
-- Modelo:
--   cash_entries.forma_pagamento -> dinheiro | pix | cartao_debito | cartao_credito (opcional no banco;
--                                   lancamentos antigos ficam sem forma e aparecem como "nao_informado").
--   finance_by_method(empresa, inicio, fim) -> uma linha por forma com entradas, saidas e saldo do periodo.
--
-- Regras (iguais as da finance_summary, que NAO muda):
--   * So contam movimentos a partir da data do saldo inicial.
--   * Entradas = pagamentos de atendimentos (payments.valor) + entradas avulsas.
--   * Saidas   = despesas avulsas + taxa de cartao do pagamento (na forma do pagamento).
--   * Comissoes e compras de estoque nao tem forma: entram em "nao_informado".
--   * A soma de saldo das linhas = movimento do periodo da finance_summary (sem o saldo inicial).

-- ---------------------------------------------------------------- coluna
alter table public.cash_entries
  add column if not exists forma_pagamento text;

alter table public.cash_entries drop constraint if exists cash_entries_forma_pagamento_check;
alter table public.cash_entries
  add constraint cash_entries_forma_pagamento_check check (
    forma_pagamento is null
    or forma_pagamento in ('dinheiro', 'pix', 'cartao_debito', 'cartao_credito')
  );

-- O saldo inicial tem seu proprio detalhe (caixa/pix/conta, etapa 24): nao usa forma.
alter table public.cash_entries drop constraint if exists cash_entries_forma_so_lancamentos;
alter table public.cash_entries
  add constraint cash_entries_forma_so_lancamentos check (
    tipo <> 'saldo_inicial' or forma_pagamento is null
  );

-- cash_entries usa GRANT por coluna (016): a coluna nova precisa ser liberada.
grant insert (forma_pagamento) on public.cash_entries to authenticated;
grant update (forma_pagamento) on public.cash_entries to authenticated;

-- ---------------------------------------------------------------- totais por forma
create or replace function public.finance_by_method(
  p_company_id uuid,
  p_start date,
  p_end date
)
returns table (
  forma text,
  entradas numeric,
  saidas numeric,
  saldo numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz constant text := 'America/Sao_Paulo';
  v_base_data date;
  v_from date;
begin
  if p_company_id is null or p_start is null or p_end is null or p_end < p_start then
    raise exception 'Periodo invalido.';
  end if;

  -- Usuario logado: so a propria empresa e so admin. Service role (auth.uid() nulo): livre.
  if auth.uid() is not null then
    if p_company_id is distinct from public.current_company_id()
       or not public.is_company_admin() then
      raise exception 'Acesso negado.';
    end if;
  end if;

  select ce.data_lancamento
    into v_base_data
  from public.cash_entries ce
  where ce.company_id = p_company_id
    and ce.tipo = 'saldo_inicial'
  limit 1;

  v_from := greatest(p_start, coalesce(v_base_data, date '1900-01-01'));

  return query
  with mov as (
    select
      case when p.forma_pagamento in ('dinheiro', 'pix', 'cartao_debito', 'cartao_credito')
           then p.forma_pagamento else 'nao_informado' end as f,
      (p.created_at at time zone v_tz)::date as d,
      p.valor::numeric as entrada,
      coalesce(p.valor_taxa, 0)::numeric as saida
    from public.payments p
    where p.company_id = p_company_id
    union all
    select
      'nao_informado'::text,
      (p.created_at at time zone v_tz)::date,
      0::numeric,
      coalesce(p.valor_comissao, 0)::numeric
    from public.payments p
    where p.company_id = p_company_id
    union all
    select
      'nao_informado'::text,
      (m.data_movimento at time zone v_tz)::date,
      0::numeric,
      coalesce(m.custo_total, 0)::numeric
    from public.stock_movements m
    where m.company_id = p_company_id and m.tipo = 'entrada' and m.motivo = 'compra'
    union all
    select
      coalesce(ce.forma_pagamento, 'nao_informado'),
      ce.data_lancamento,
      case when ce.tipo = 'entrada' then ce.valor else 0 end::numeric,
      case when ce.tipo = 'despesa' then ce.valor else 0 end::numeric
    from public.cash_entries ce
    where ce.company_id = p_company_id and ce.tipo in ('entrada', 'despesa')
  ),
  formas as (
    select unnest(array['dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'nao_informado']) as f
  )
  select
    fo.f,
    round(coalesce(sum(mv.entrada), 0), 2),
    round(coalesce(sum(mv.saida), 0), 2),
    round(coalesce(sum(mv.entrada - mv.saida), 0), 2)
  from formas fo
  left join mov mv on mv.f = fo.f and mv.d between v_from and p_end
  group by fo.f
  order by array_position(array['dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'nao_informado'], fo.f);
end;
$$;

revoke all on function public.finance_by_method(uuid, date, date) from public;
revoke all on function public.finance_by_method(uuid, date, date) from anon;
grant execute on function public.finance_by_method(uuid, date, date) to authenticated, service_role;

-- ---------------------------------------------------------------- conferencia (SQL Editor)
-- 1) Coluna e permissoes (esperado: 'forma_pagamento' na lista de UPDATE):
--    select column_name from information_schema.column_privileges
--    where table_schema = 'public' and table_name = 'cash_entries'
--      and grantee = 'authenticated' and privilege_type in ('UPDATE', 'INSERT') order by 1;
-- 2) Totais por forma (service role/SQL Editor; troque o ID e as datas):
--    select * from public.finance_by_method('<ID_DA_EMPRESA>', date '2026-11-01', date '2026-11-30');
-- 3) Fechamento (a soma da coluna saldo deve bater com o movimento da finance_summary, sem o saldo inicial):
--    select sum(saldo) from public.finance_by_method('<ID_DA_EMPRESA>', date '2026-11-01', date '2026-11-30');
--    select receitas + entradas_avulsas - comissoes - taxas_cartao - compras_estoque - despesas as movimento
--    from public.finance_summary('<ID_DA_EMPRESA>', date '2026-11-01', date '2026-11-30');