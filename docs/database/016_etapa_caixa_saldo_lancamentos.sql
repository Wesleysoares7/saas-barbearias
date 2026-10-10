-- Etapa 16: caixa (saldo inicial + lancamentos avulsos) e resumo financeiro calculado no banco
-- Execute no Supabase SQL Editor APOS 001..015 (precisa das tabelas payments e stock_movements - etapa 14).
-- Seguro para reexecucao.
--
-- Modelo:
--   cash_entries  -> lancamentos de caixa por empresa, em 3 tipos:
--       saldo_inicial : no maximo UM por empresa; valor pode ser negativo; vale "no inicio do dia" da data informada
--       entrada       : dinheiro que entrou fora de atendimentos (valor > 0)
--       despesa       : aluguel, luz, retirada etc. (valor > 0)
--   finance_summary(company, inicio, fim) -> uma linha com todos os totais do periodo
--
-- Regra do saldo (anterior + movimentos = final):
--   * Sem saldo inicial: saldo anterior = tudo que aconteceu antes do periodo.
--   * Com saldo inicial na data D: so contam movimentos a partir de D (o que veio antes ja esta dentro do saldo informado).
--   * saldo_final = saldo_anterior + saldo_inicial_no_periodo + receitas + entradas_avulsas
--                   - comissoes - compras_estoque - despesas
--   * consumo_estoque e informativo (nao entra no saldo).
-- Datas de pagamentos e de movimentos de estoque sao convertidas para America/Sao_Paulo DENTRO do banco,
-- entao o resultado nao depende do fuso do servidor.
-- So administradores da empresa leem/escrevem. Service role (modo suporte) continua livre.

-- ---------------------------------------------------------------- tipo
do $$
begin
  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'cash_entry_type' and n.nspname = 'public'
  ) then
    create type public.cash_entry_type as enum ('saldo_inicial', 'entrada', 'despesa');
  end if;
end
$$;

-- ---------------------------------------------------------------- helper
create or replace function public.is_company_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = public.current_company_id()
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_company_admin() from public;
grant execute on function public.is_company_admin() to authenticated;

-- ---------------------------------------------------------------- cash_entries
create table if not exists public.cash_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tipo public.cash_entry_type not null,
  valor numeric(12,2) not null,
  categoria text,
  descricao text,
  data_lancamento date not null,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cash_entries_valor_check check (tipo = 'saldo_inicial' or valor > 0),
  constraint cash_entries_categoria_len check (categoria is null or char_length(categoria) <= 60),
  constraint cash_entries_descricao_len check (descricao is null or char_length(descricao) <= 200),
  constraint cash_entries_descricao_required check (
    tipo = 'saldo_inicial' or char_length(trim(coalesce(descricao, ''))) >= 2
  ),
  constraint cash_entries_data_min check (data_lancamento >= date '2020-01-01')
);

create index if not exists idx_cash_entries_company_data
  on public.cash_entries (company_id, data_lancamento desc);

-- No maximo um saldo inicial por empresa.
create unique index if not exists idx_cash_entries_one_opening_balance
  on public.cash_entries (company_id)
  where tipo = 'saldo_inicial';

drop trigger if exists trg_cash_entries_updated_at on public.cash_entries;
create trigger trg_cash_entries_updated_at
before update on public.cash_entries
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- RLS
alter table public.cash_entries enable row level security;

drop policy if exists cash_entries_select_admin on public.cash_entries;
drop policy if exists cash_entries_insert_admin on public.cash_entries;
drop policy if exists cash_entries_update_admin on public.cash_entries;
drop policy if exists cash_entries_delete_admin on public.cash_entries;

create policy cash_entries_select_admin on public.cash_entries
for select to authenticated
using (company_id = public.current_company_id() and public.is_company_admin());

create policy cash_entries_insert_admin on public.cash_entries
for insert to authenticated
with check (
  company_id = public.current_company_id()
  and public.is_company_admin()
  and (created_by is null or created_by = auth.uid())
);

create policy cash_entries_update_admin on public.cash_entries
for update to authenticated
using (company_id = public.current_company_id() and public.is_company_admin())
with check (company_id = public.current_company_id());

create policy cash_entries_delete_admin on public.cash_entries
for delete to authenticated
using (company_id = public.current_company_id() and public.is_company_admin());

-- ---------------------------------------------------------------- GRANTs
-- tipo e company_id nao podem ser alterados depois de criados.
-- created_by precisa estar no INSERT: o app grava o usuario explicitamente (e a policy exige created_by = auth.uid()).
revoke all on public.cash_entries from authenticated;
grant select, delete on public.cash_entries to authenticated;
grant insert (company_id, tipo, valor, categoria, descricao, data_lancamento, created_by)
  on public.cash_entries to authenticated;
grant update (valor, categoria, descricao, data_lancamento)
  on public.cash_entries to authenticated;

-- ---------------------------------------------------------------- finance_summary
create or replace function public.finance_summary(
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

  -- Usuario logado: so a propria empresa e so admin. Service role (auth.uid() nulo): livre.
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
          when 'compra' then -ev.v
          when 'despesa' then -ev.v
          else 0
        end
      end
    ), 0),
    coalesce(sum(ev.v) filter (where ev.k = 'receita' and ev.d between v_from and p_end), 0),
    coalesce(sum(ev.v) filter (where ev.k = 'comissao' and ev.d between v_from and p_end), 0),
    coalesce(sum(ev.v) filter (where ev.k = 'compra' and ev.d between v_from and p_end), 0),
    coalesce(sum(ev.v) filter (where ev.k = 'entrada_avulsa' and ev.d between v_from and p_end), 0),
    coalesce(sum(ev.v) filter (where ev.k = 'despesa' and ev.d between v_from and p_end), 0),
    coalesce(sum(ev.v) filter (where ev.k = 'consumo' and ev.d between v_from and p_end), 0)
  into v_ant_net, v_receitas, v_comissoes, v_compras, v_entradas, v_despesas, v_consumo
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
    round(v_compras, 2),
    round(v_entradas, 2),
    round(v_despesas, 2),
    round(v_consumo, 2),
    round(
      v_saldo_anterior + v_ini_periodo + v_receitas - v_comissoes - v_compras + v_entradas - v_despesas,
      2
    );
end;
$$;

revoke all on function public.finance_summary(uuid, date, date) from public;
revoke all on function public.finance_summary(uuid, date, date) from anon;
grant execute on function public.finance_summary(uuid, date, date) to authenticated, service_role;

-- ---------------------------------------------------------------- testes (SQL Editor; troque <COMPANY_ID>)
-- No SQL Editor auth.uid() e nulo, entao a funcao roda livre. Os inserts abaixo usam created_by nulo.
--
-- 1) Sem nenhum saldo inicial: resultado = soma de tudo que ja aconteceu.
--    select * from public.finance_summary('<COMPANY_ID>', date '2026-10-01', date '2026-10-31');
--
-- 2) Saldo inicial de 1000 em 05/10, entrada avulsa 200 em 06/10, despesa 150 em 07/10:
--    insert into public.cash_entries (company_id, tipo, valor, data_lancamento)
--      values ('<COMPANY_ID>', 'saldo_inicial', 1000, date '2026-10-05');
--    insert into public.cash_entries (company_id, tipo, valor, descricao, data_lancamento)
--      values ('<COMPANY_ID>', 'entrada', 200, 'Venda de produto', date '2026-10-06'),
--             ('<COMPANY_ID>', 'despesa', 150, 'Conta de luz', date '2026-10-07');
--    select * from public.finance_summary('<COMPANY_ID>', date '2026-10-01', date '2026-10-31');
--      esperado: saldo_inicial_valor 1000 | saldo_inicial_no_periodo 1000 | entradas_avulsas 200 | despesas 150
--                e saldo_final = 1000 + receitas + 200 - comissoes - compras_estoque - 150
--    Periodo que comeca DEPOIS do saldo inicial (ex.: 08/10 a 31/10): saldo_anterior = 1000 + 200 - 150 + o que
--    houve entre 05/10 e 07/10 (receitas - comissoes - compras); saldo_inicial_no_periodo = 0.
--    Periodo inteiro ANTES de 05/10: tudo zero (o caixa so existe a partir da data do saldo inicial).
--
-- 3) Segundo saldo inicial na mesma empresa deve falhar (indice unico):
--    insert into public.cash_entries (company_id, tipo, valor, data_lancamento)
--      values ('<COMPANY_ID>', 'saldo_inicial', 500, date '2026-10-10');   -- ERRO esperado
--
-- 4) Limpar o teste:
--    delete from public.cash_entries where company_id = '<COMPANY_ID>';