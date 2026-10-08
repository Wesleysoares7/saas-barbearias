-- Etapa 14: Almoxarifado (estoque de produtos do salao)
-- Execute no Supabase SQL Editor APOS 001..013.
-- Seguro para reexecucao.
--
-- Modelo:
--   products         -> cadastro do produto + saldo atual (mantido SOMENTE por trigger)
--   stock_movements  -> livro-razao de entradas/saidas (imutavel: sem UPDATE/DELETE)
-- Regras garantidas no banco:
--   * saldo nunca fica negativo
--   * custo medio ponderado recalculado a cada entrada
--   * saida grava o custo medio da hora (snapshot) -> valor consumido fica correto no historico
--   * apenas admin da empresa le/escreve (RLS)
--   * app nao consegue editar quantidade_atual/custo_medio direto (GRANT por coluna)

-- ---------------------------------------------------------------- tipos
do $$
begin
  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'stock_movement_type' and n.nspname = 'public'
  ) then
    create type public.stock_movement_type as enum ('entrada', 'saida');
  end if;

  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'stock_movement_reason' and n.nspname = 'public'
  ) then
    create type public.stock_movement_reason as enum
      ('compra', 'devolucao', 'ajuste', 'uso_interno', 'venda', 'perda');
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

-- ---------------------------------------------------------------- products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  nome text not null,
  categoria text,
  sku text,
  unidade text not null default 'un',
  estoque_minimo numeric(12,3) not null default 0,
  quantidade_atual numeric(12,3) not null default 0,
  custo_medio numeric(12,4) not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_nome_min_length check (char_length(trim(nome)) >= 2),
  constraint products_unidade_check check (unidade in ('un', 'ml', 'l', 'g', 'kg')),
  constraint products_estoque_minimo_nonneg check (estoque_minimo >= 0),
  constraint products_quantidade_nonneg check (quantidade_atual >= 0),
  constraint products_custo_medio_nonneg check (custo_medio >= 0),
  constraint products_id_company_unique unique (id, company_id)
);

create unique index if not exists idx_products_company_nome_unique
  on public.products (company_id, lower(trim(nome)));
create index if not exists idx_products_company_ativo
  on public.products (company_id, ativo);

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- stock_movements
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  product_id uuid not null,
  tipo public.stock_movement_type not null,
  motivo public.stock_movement_reason not null,
  quantidade numeric(12,3) not null,
  custo_unitario numeric(12,4) not null default 0,
  custo_total numeric(12,2) generated always as (round(quantidade * custo_unitario, 2)) stored,
  observacao text,
  data_movimento timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint stock_movements_quantidade_positive check (quantidade > 0),
  constraint stock_movements_custo_nonneg check (custo_unitario >= 0),
  constraint stock_movements_tipo_motivo check (
    (tipo = 'entrada' and motivo in ('compra', 'devolucao', 'ajuste'))
    or (tipo = 'saida' and motivo in ('uso_interno', 'venda', 'perda', 'ajuste'))
  ),
  constraint stock_movements_product_company_fk
    foreign key (product_id, company_id)
    references public.products (id, company_id)
    on delete restrict
);

create index if not exists idx_stock_movements_company_data
  on public.stock_movements (company_id, data_movimento desc);
create index if not exists idx_stock_movements_product_data
  on public.stock_movements (product_id, data_movimento desc);

-- ---------------------------------------------------------------- trigger de saldo
create or replace function public.apply_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qtd numeric(12,3);
  v_custo numeric(12,4);
  v_nova_qtd numeric(12,3);
  v_novo_custo numeric(12,4);
begin
  -- trava a linha do produto: evita corrida entre duas movimentacoes simultaneas
  select p.quantidade_atual, p.custo_medio
    into v_qtd, v_custo
  from public.products p
  where p.id = new.product_id
    and p.company_id = new.company_id
  for update;

  if not found then
    raise exception 'Produto nao encontrado para esta empresa.';
  end if;

  if new.tipo = 'entrada' then
    -- devolucao/ajuste sem custo informado entram ao custo medio atual
    if new.motivo <> 'compra' and new.custo_unitario = 0 then
      new.custo_unitario := v_custo;
    end if;

    v_nova_qtd := v_qtd + new.quantidade;
    v_novo_custo := round(
      (v_qtd * v_custo + new.quantidade * new.custo_unitario) / v_nova_qtd,
      4
    );
  else
    if v_qtd < new.quantidade then
      raise exception 'Estoque insuficiente. Disponivel: %', v_qtd;
    end if;

    -- snapshot: o custo da saida e sempre o custo medio no momento
    new.custo_unitario := v_custo;
    v_nova_qtd := v_qtd - new.quantidade;
    v_novo_custo := v_custo;
  end if;

  update public.products
  set quantidade_atual = v_nova_qtd,
      custo_medio = v_novo_custo
  where id = new.product_id
    and company_id = new.company_id;

  return new;
end;
$$;

drop trigger if exists trg_stock_movements_apply on public.stock_movements;
create trigger trg_stock_movements_apply
before insert on public.stock_movements
for each row execute function public.apply_stock_movement();

-- ---------------------------------------------------------------- RLS
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;

drop policy if exists products_select_admin on public.products;
drop policy if exists products_insert_admin on public.products;
drop policy if exists products_update_admin on public.products;
drop policy if exists products_delete_admin on public.products;
drop policy if exists stock_movements_select_admin on public.stock_movements;
drop policy if exists stock_movements_insert_admin on public.stock_movements;

create policy products_select_admin on public.products
for select to authenticated
using (company_id = public.current_company_id() and public.is_company_admin());

create policy products_insert_admin on public.products
for insert to authenticated
with check (company_id = public.current_company_id() and public.is_company_admin());

create policy products_update_admin on public.products
for update to authenticated
using (company_id = public.current_company_id() and public.is_company_admin())
with check (company_id = public.current_company_id());

create policy products_delete_admin on public.products
for delete to authenticated
using (company_id = public.current_company_id() and public.is_company_admin());

create policy stock_movements_select_admin on public.stock_movements
for select to authenticated
using (company_id = public.current_company_id() and public.is_company_admin());

create policy stock_movements_insert_admin on public.stock_movements
for insert to authenticated
with check (
  company_id = public.current_company_id()
  and public.is_company_admin()
  and created_by = auth.uid()
);
-- Sem policy de UPDATE/DELETE em stock_movements: historico imutavel.
-- Correcao de erro = novo movimento contrario (motivo 'ajuste').

-- ---------------------------------------------------------------- GRANTs
-- products: o app nunca grava quantidade_atual / custo_medio (so o trigger).
revoke all on public.products from authenticated;
grant select, delete on public.products to authenticated;
grant insert (company_id, nome, categoria, sku, unidade, estoque_minimo, ativo)
  on public.products to authenticated;
grant update (nome, categoria, sku, unidade, estoque_minimo, ativo)
  on public.products to authenticated;

revoke all on public.stock_movements from authenticated;
grant select, insert on public.stock_movements to authenticated;

-- ---------------------------------------------------------------- teste rapido (opcional)
-- Rode logado como admin (ou no SQL Editor trocando auth.uid() por um user_id valido):
--   insert into products (company_id, nome, unidade) values ('<COMPANY_ID>', 'Pomada modeladora', 'un');
--   insert into stock_movements (company_id, product_id, tipo, motivo, quantidade, custo_unitario)
--     values ('<COMPANY_ID>', '<PRODUCT_ID>', 'entrada', 'compra', 10, 25.00);
--   insert into stock_movements (company_id, product_id, tipo, motivo, quantidade)
--     values ('<COMPANY_ID>', '<PRODUCT_ID>', 'saida', 'uso_interno', 3);
--   select nome, quantidade_atual, custo_medio from products;   -- esperado: 7 | 25.0000
--   -- saida de 8 deve falhar com "Estoque insuficiente".
