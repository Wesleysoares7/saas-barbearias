-- Etapa 28: taxa do cartao de credito. Seguro para reexecucao.

-- 1) taxa da empresa (null = ainda nao informada)
alter table public.companies add column if not exists taxa_cartao_credito numeric(5,2);
alter table public.companies drop constraint if exists companies_taxa_cartao_range;
alter table public.companies add constraint companies_taxa_cartao_range
  check (taxa_cartao_credito is null or (taxa_cartao_credito >= 0 and taxa_cartao_credito <= 100));
grant update (taxa_cartao_credito) on public.companies to authenticated;

-- 2) taxa congelada em cada pagamento
alter table public.payments
  add column if not exists taxa_percentual numeric(5,2) not null default 0,
  add column if not exists valor_taxa numeric(10,2) not null default 0;
alter table public.payments drop constraint if exists payments_taxa_range;
alter table public.payments add constraint payments_taxa_range
  check (taxa_percentual >= 0 and taxa_percentual <= 100 and valor_taxa >= 0);

-- 3) gatilho: o banco calcula a taxa (o app nao consegue forjar)
create or replace function public.payments_apply_card_fee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_taxa numeric(5,2);
begin
  if new.forma_pagamento is distinct from 'cartao_credito' then
    new.taxa_percentual := 0;
    new.valor_taxa := 0;
    return new;
  end if;

  if tg_op = 'UPDATE' and old.forma_pagamento = 'cartao_credito' then
    v_taxa := old.taxa_percentual; -- edicao: mantem a taxa da epoca
  else
    select c.taxa_cartao_credito into v_taxa
    from public.companies c where c.id = new.company_id;

    if v_taxa is null then
      raise exception 'Informe a taxa do cartão de crédito em Configurações antes de registrar pagamentos no cartão.';
    end if;
  end if;

  new.taxa_percentual := v_taxa;
  new.valor_taxa := round(new.valor * v_taxa / 100, 2);
  return new;
end;
$$;

drop trigger if exists trg_payments_card_fee on public.payments;
create trigger trg_payments_card_fee
before insert or update of valor, forma_pagamento on public.payments
for each row execute function public.payments_apply_card_fee();

-- 4) resumo: nova coluna taxas_cartao (muda o tipo de retorno, entao drop + create)
drop function if exists public.finance_summary(uuid, date, date);

create function public.finance_summary(
  p_company_id uuid,
  p_start date,
  p_end date
)
returns table (
  saldo_inicial_valor numeric,
  saldo_inicial_data date,
  saldo_anterior numeric,
  saldo_inicial_no_periodo numeric,
  receitas numeric,
  comissoes numeric,
  taxas_cartao numeric,
  compras_estoque numeric,
  entradas_avulsas numeric,
  despesas numeric,
  consumo_estoque numeric,
  saldo_final numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz constant text := 'America/Sao_Paulo';
  v_base_valor numeric := 0;
  v_base_data date;
  v_ref date;
  v_from date;
  v_ant_net numeric := 0;
  v_receitas numeric := 0;
  v_comissoes numeric := 0;
  v_taxas numeric := 0;
  v_compras numeric := 0;
  v_entradas numeric := 0;
  v_despesas numeric := 0;
  v_consumo numeric := 0;
  v_saldo_anterior numeric := 0;
  v_ini_periodo numeric := 0;
begin
  if p_company_id is null or p_start is null or p_end is null or p_end < p_start then
    raise exception 'Periodo invalido.';
  end if;

  if auth.uid() is not null then
    if p_company_id is distinct from public.current_company_id()
       or not public.is_company_admin() then
      raise exception 'Acesso negado.';
    end if;
  end if;

  select ce.valor, ce.data_lancamento
    into v_base_valor, v_base_data
  from public.cash_entries ce
  where ce.company_id = p_company_id
    and ce.tipo = 'saldo_inicial'
  limit 1;

  v_base_valor := coalesce(v_base_valor, 0);
  v_ref := coalesce(v_base_data, date '1900-01-01');
  v_from := greatest(p_start, v_ref);

  with ev as (
    select (p.created_at at time zone v_tz)::date as d, 'receita'::text as k, p.valor::numeric as v
      from public.payments p
      where p.company_id = p_company_id
    union all
    select (p.created_at at time zone v_tz)::date, 'comissao'::text, p.valor_comissao::numeric
      from public.payments p
      where p.company_id = p_company_id
    union all
    select (p.created_at at time zone v_tz)::date, 'taxa'::text, p.valor_taxa::numeric
      from public.payments p
      where p.company_id = p_company_id
    union all
    select (m.data_movimento at time zone v_tz)::date, 'compra'::text, m.custo_total::numeric
      from public.stock_movements m
      where m.company_id = p_company_id and m.tipo = 'entrada' and m.motivo = 'compra'
    union all
    select (m.data_movimento at time zone v_tz)::date, 'consumo'::text, m.custo_total::numeric
      from public.stock_movements m
      where m.company_id = p_company_id and m.tipo = 'saida'
    union all
    select ce.data_lancamento, 'entrada_avulsa'::text, ce.valor::numeric
      from public.cash_entries ce
      where ce.company_id = p_company_id and ce.tipo = 'entrada'
    union all
    select ce.data_lancamento, 'despesa'::text, ce.valor::numeric
      from public.cash_entries ce
      where ce.company_id = p_company_id and ce.tipo = 'despesa'
  )
  select
    coalesce(sum(
      case when ev.d >= v_ref and ev.d < p_start then
        case ev.k
          when 'receita' then ev.v
          when 'entrada_avulsa' then ev.v
          when 'comissao' then -ev.v
          when 'taxa' then -ev.v
          when 'compra' then -ev.v
          when 'despesa' then -ev.v
          else 0
        end
      end
    ), 0),
    coalesce(sum(ev.v) filter (where ev.k = 'receita' and ev.d between v_from and p_end), 0),
    coalesce(sum(ev.v) filter (where ev.k = 'comissao' and ev.d between v_from and p_end), 0),
    coalesce(sum(ev.v) filter (where ev.k = 'taxa' and ev.d between v_from and p_end), 0),
    coalesce(sum(ev.v) filter (where ev.k = 'compra' and ev.d between v_from and p_end), 0),
    coalesce(sum(ev.v) filter (where ev.k = 'entrada_avulsa' and ev.d between v_from and p_end), 0),
    coalesce(sum(ev.v) filter (where ev.k = 'despesa' and ev.d between v_from and p_end), 0),
    coalesce(sum(ev.v) filter (where ev.k = 'consumo' and ev.d between v_from and p_end), 0)
  into v_ant_net, v_receitas, v_comissoes, v_taxas, v_compras, v_entradas, v_despesas, v_consumo
  from ev;

  if v_base_data is not null and v_base_data < p_start then
    v_saldo_anterior := v_base_valor + v_ant_net;
  else
    v_saldo_anterior := v_ant_net;
  end if;

  if v_base_data is not null and v_base_data between p_start and p_end then
    v_ini_periodo := v_base_valor;
  else
    v_ini_periodo := 0;
  end if;

  return query
  select
    case when v_base_data is null then null::numeric else round(v_base_valor, 2) end,
    v_base_data,
    round(v_saldo_anterior, 2),
    round(v_ini_periodo, 2),
    round(v_receitas, 2),
    round(v_comissoes, 2),
    round(v_taxas, 2),
    round(v_compras, 2),
    round(v_entradas, 2),
    round(v_despesas, 2),
    round(v_consumo, 2),
    round(
      v_saldo_anterior + v_ini_periodo + v_receitas - v_comissoes - v_taxas - v_compras + v_entradas - v_despesas,
      2
    );
end;
$$;

revoke all on function public.finance_summary(uuid, date, date) from public;
revoke all on function public.finance_summary(uuid, date, date) from anon;
grant execute on function public.finance_summary(uuid, date, date) to authenticated, service_role;