import Link from "next/link";
import { AlertTriangle, Boxes, Package, Search } from "lucide-react";
import { redirect } from "next/navigation";

import { CreateProductDialog } from "@/components/painel/estoque/create-product-form";
import { ProductActions } from "@/components/painel/estoque/product-actions";
import { CollapsibleFilters } from "@/components/painel/ui/collapsible-filters";
import { PageHeader } from "@/components/painel/ui/page-header";
import { Panel } from "@/components/painel/ui/panel";
import { StatCard } from "@/components/painel/ui/stat-card";
import { StatusPill } from "@/components/painel/ui/status-pill";
import { canAccessModule, getAccessContext } from "@/lib/auth/access";
import { REASON_LABELS, type Product, type StockMovement } from "@/types/stock";

type SearchParams = {
  aba?: string;
  q?: string;
  filtro?: string;
  categoria?: string;
  pagina?: string;
  start?: string;
  end?: string;
  produto?: string;
  tipo?: string;
};

type Tab = "produtos" | "movimentacoes";
type ProductFilter = "todos" | "baixo" | "inativos";

type SummaryProduct = {
  id: string;
  nome: string;
  categoria: string | null;
  quantidade_atual: number | string;
  custo_medio: number | string;
  estoque_minimo: number | string;
};

const PRODUCTS_PAGE_SIZE = 15;
const MOVEMENTS_PAGE_SIZE = 20;

const FIELD_CLASS =
  "h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-base text-foreground outline-none focus:border-brand";
const BUTTON_CLASS =
  "h-11 rounded-xl border border-border bg-surface-2 px-4 text-sm font-medium text-foreground transition hover:border-brand hover:text-brand";

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(value);
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeDateInput(value: string | undefined, fallback: string): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fallback;
  }

  return value;
}

function parsePage(value: string | undefined): number {
  const page = Number.parseInt(value ?? "1", 10);

  return Number.isFinite(page) && page > 0 ? page : 1;
}

function getProductName(products: StockMovement["products"]): string {
  const product = Array.isArray(products) ? products[0] : products;

  return product?.nome ?? "Produto removido";
}

function getProductUnit(products: StockMovement["products"]): string {
  const product = Array.isArray(products) ? products[0] : products;

  return product?.unidade ?? "";
}

function buildHref(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }

  return `/painel/estoque?${search.toString()}`;
}

function Pagination({
  page,
  pageSize,
  total,
  hrefFor,
}: {
  page: number;
  pageSize: number;
  total: number;
  hrefFor: (page: number) => string;
}) {
  if (total === 0) {
    return null;
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const hasPrevious = page > 1;
  const hasNext = to < total;
  const linkClass = `${BUTTON_CLASS} inline-flex items-center`;
  const disabledClass = `${linkClass} pointer-events-none opacity-50`;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Mostrando {from}-{to} de {total}
      </p>
      <div className="flex gap-2">
        {hasPrevious ? (
          <Link href={hrefFor(page - 1)} className={linkClass}>
            Anterior
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">
            Anterior
          </span>
        )}
        {hasNext ? (
          <Link href={hrefFor(page + 1)} className={linkClass}>
            Proximo
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">
            Proximo
          </span>
        )}
      </div>
    </div>
  );
}

function ProductStatus({ product }: { product: Product }) {
  const isLow = Number(product.quantidade_atual) <= Number(product.estoque_minimo);

  if (!product.ativo) {
    return <StatusPill tone="neutral">Inativo</StatusPill>;
  }

  return isLow ? <StatusPill tone="danger">Estoque baixo</StatusPill> : <StatusPill tone="success">Ok</StatusPill>;
}

export default async function EstoquePage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const { supabase, companyId, role, redirectTo } = await getAccessContext();

  if (!companyId || !role) {
    redirect(redirectTo ?? "/login");
  }

  if (!canAccessModule(role, "estoque")) {
    redirect("/painel");
  }

  const tab: Tab = resolvedSearchParams.aba === "movimentacoes" ? "movimentacoes" : "produtos";
  const filtro: ProductFilter =
    resolvedSearchParams.filtro === "baixo" || resolvedSearchParams.filtro === "inativos"
      ? resolvedSearchParams.filtro
      : "todos";
  const query = (resolvedSearchParams.q ?? "").trim();
  const categoria = (resolvedSearchParams.categoria ?? "").trim();
  const page = parsePage(resolvedSearchParams.pagina);

  const now = new Date();
  const defaultStart = toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
  const defaultEnd = toDateInputValue(now);
  const start = normalizeDateInput(resolvedSearchParams.start, defaultStart);
  const end = normalizeDateInput(resolvedSearchParams.end, defaultEnd);
  const produtoId = (resolvedSearchParams.produto ?? "").trim();
  const tipo = resolvedSearchParams.tipo === "entrada" || resolvedSearchParams.tipo === "saida" ? resolvedSearchParams.tipo : "";

  // Resumo e selects: consulta leve, independente da pagina atual.
  const summaryResponse = await supabase
    .from("products")
    .select("id, nome, categoria, quantidade_atual, custo_medio, estoque_minimo")
    .eq("company_id", companyId)
    .eq("ativo", true)
    .order("nome", { ascending: true });

  const summaryProducts = (summaryResponse.data ?? []) as SummaryProduct[];
  const lowStockIds = summaryProducts
    .filter((product) => Number(product.quantidade_atual) <= Number(product.estoque_minimo))
    .map((product) => product.id);
  const totalStockValue = roundToTwo(
    summaryProducts.reduce((sum, product) => sum + Number(product.quantidade_atual) * Number(product.custo_medio), 0),
  );
  const categories = Array.from(
    new Set(summaryProducts.map((product) => product.categoria).filter((value): value is string => Boolean(value))),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  let products: Product[] = [];
  let productsTotal = 0;
  let movements: StockMovement[] = [];
  let movementsTotal = 0;
  let listError: string | undefined;

  if (tab === "produtos") {
    const from = (page - 1) * PRODUCTS_PAGE_SIZE;
    let productsQuery = supabase
      .from("products")
      .select("id, nome, categoria, sku, unidade, estoque_minimo, quantidade_atual, custo_medio, ativo", { count: "exact" })
      .eq("company_id", companyId);

    if (query) {
      productsQuery = productsQuery.ilike("nome", `%${query.replace(/[%,()]/g, " ")}%`);
    }

    if (categoria) {
      productsQuery = productsQuery.eq("categoria", categoria);
    }

    if (filtro === "inativos") {
      productsQuery = productsQuery.eq("ativo", false);
    } else if (filtro === "baixo") {
      productsQuery = productsQuery.in("id", lowStockIds.length > 0 ? lowStockIds : ["00000000-0000-0000-0000-000000000000"]);
    }

    const response = await productsQuery
      .order("nome", { ascending: true })
      .range(from, from + PRODUCTS_PAGE_SIZE - 1);

    products = (response.data ?? []) as Product[];
    productsTotal = response.count ?? 0;
    listError = response.error?.message;
  } else {
    const from = (page - 1) * MOVEMENTS_PAGE_SIZE;
    let movementsQuery = supabase
      .from("stock_movements")
      .select(
        "id, product_id, tipo, motivo, quantidade, custo_unitario, custo_total, observacao, data_movimento, products(nome, unidade)",
        { count: "exact" },
      )
      .eq("company_id", companyId)
      .gte("data_movimento", new Date(`${start}T00:00:00.000`).toISOString())
      .lte("data_movimento", new Date(`${end}T23:59:59.999`).toISOString());

    if (produtoId) {
      movementsQuery = movementsQuery.eq("product_id", produtoId);
    }

    if (tipo) {
      movementsQuery = movementsQuery.eq("tipo", tipo);
    }

    const response = await movementsQuery
      .order("data_movimento", { ascending: false })
      .range(from, from + MOVEMENTS_PAGE_SIZE - 1);

    movements = (response.data ?? []) as StockMovement[];
    movementsTotal = response.count ?? 0;
    listError = response.error?.message;
  }

  const hasTableIssue = Boolean(
    summaryResponse.error?.message.includes("products") ||
      listError?.includes("products") ||
      listError?.includes("stock_movements"),
  );

  const productParams = { aba: "produtos", q: query, filtro: filtro === "todos" ? undefined : filtro, categoria };
  const movementParams = { aba: "movimentacoes", start, end, produto: produtoId, tipo };
  const formatShortDate = (value: string) => `${value.slice(8, 10)}/${value.slice(5, 7)}`;
  const selectedProduct = summaryProducts.find((product) => product.id === produtoId);
  const movementSummary = `${formatShortDate(start)} - ${formatShortDate(end)} · ${selectedProduct?.nome ?? "Todos"} · ${
    tipo === "entrada" ? "Entradas" : tipo === "saida" ? "Saidas" : "Todos"
  }`;
  const movementActive = (produtoId ? 1 : 0) + (tipo ? 1 : 0);
  const productSummaryParts = [
    query ? `"${query}"` : null,
    filtro === "baixo" ? "Estoque baixo" : filtro === "inativos" ? "Inativos" : null,
    categoria || null,
  ].filter((part): part is string => part !== null);
  const productSummary = productSummaryParts.length > 0 ? productSummaryParts.join(" · ") : "Todos";
  const productActive = productSummaryParts.length;
  const chipClass = (active: boolean) =>
    `inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition ${
      active ? "border-brand bg-brand/10 text-brand" : "border-border bg-surface-2 text-foreground hover:border-brand"
    }`;
  const tabClass = (active: boolean) =>
    `flex min-h-11 flex-1 items-center justify-center border-b-2 px-4 text-sm font-medium transition sm:flex-none ${
      active ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="space-y-5 pb-24">
      <PageHeader
        icon={Package}
        title="Estoque"
        description="Controle os produtos do almoxarifado, entradas, saidas e custo medio."
        actions={<CreateProductDialog />}
      />

      {hasTableIssue ? (
        <p className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          Seu banco ainda nao foi atualizado para o estoque. Execute o script docs/database/014_etapa_almoxarifado_estoque.sql
          no Supabase SQL Editor.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Valor total em estoque"
          value={formatCurrency(totalStockValue)}
          hint="Saldo x custo medio"
          icon={Boxes}
        />
        <StatCard
          label="Itens abaixo do minimo"
          value={lowStockIds.length}
          hint="Produtos ativos"
          icon={AlertTriangle}
          tone={lowStockIds.length > 0 ? "danger" : "success"}
        />
      </div>

      <nav aria-label="Abas do estoque" className="flex border-b border-border">
        <Link href={buildHref({ aba: "produtos" })} className={tabClass(tab === "produtos")}>
          Produtos
        </Link>
        <Link href={buildHref({ aba: "movimentacoes" })} className={tabClass(tab === "movimentacoes")}>
          Movimentacoes
        </Link>
      </nav>

      {tab === "produtos" ? (
        <Panel title="Produtos" description="Saldo e custo medio sao atualizados automaticamente pelas movimentacoes.">
          <CollapsibleFilters summary={productSummary} activeCount={productActive}>
          <form className="mb-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <input type="hidden" name="aba" value="produtos" />
            {filtro !== "todos" ? <input type="hidden" name="filtro" value={filtro} /> : null}
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                name="q"
                type="search"
                defaultValue={query}
                placeholder="Buscar produto por nome"
                aria-label="Buscar produto por nome"
                className={`${FIELD_CLASS} pl-9`}
              />
            </div>
            {categories.length > 0 ? (
              <select name="categoria" defaultValue={categoria} aria-label="Filtrar por categoria" className={`${FIELD_CLASS} sm:w-48`}>
                <option value="">Todas as categorias</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            ) : null}
            <button type="submit" className={BUTTON_CLASS}>
              Buscar
            </button>
          </form>

          <div className="flex flex-wrap gap-2 md:mb-0">
            <Link href={buildHref({ ...productParams, filtro: undefined })} className={chipClass(filtro === "todos")}>
              Todos
            </Link>
            <Link href={buildHref({ ...productParams, filtro: "baixo" })} className={chipClass(filtro === "baixo")}>
              Estoque baixo
            </Link>
            <Link href={buildHref({ ...productParams, filtro: "inativos" })} className={chipClass(filtro === "inativos")}>
              Inativos
            </Link>
          </div>
          </CollapsibleFilters>

          {products.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-muted-foreground">
              {productsTotal === 0 && !query && !categoria && filtro === "todos"
                ? "Nenhum produto cadastrado ainda."
                : "Nenhum produto encontrado para os filtros."}
            </p>
          ) : (
            <>
              <div className="hidden md:block">
                <table className="w-full table-fixed text-left text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="w-[26%] py-2 pr-2 font-medium">Produto</th>
                      <th className="py-2 pr-2 font-medium">Saldo</th>
                      <th className="py-2 pr-2 font-medium">Minimo</th>
                      <th className="py-2 pr-2 font-medium">Custo medio</th>
                      <th className="py-2 pr-2 font-medium">Valor</th>
                      <th className="py-2 pr-2 font-medium">Status</th>
                      <th className="w-[30%] py-2 font-medium">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="border-b border-border/60 align-middle">
                        <td className="py-2 pr-2">
                          <p className="truncate font-medium text-foreground">{product.nome}</p>
                          <p className="truncate text-xs text-muted-foreground">{product.categoria || "Sem categoria"}</p>
                        </td>
                        <td className="py-2 pr-2 text-foreground">
                          {formatQuantity(Number(product.quantidade_atual))} {product.unidade}
                        </td>
                        <td className="py-2 pr-2 text-foreground">
                          {formatQuantity(Number(product.estoque_minimo))} {product.unidade}
                        </td>
                        <td className="py-2 pr-2 text-foreground">{formatCurrency(Number(product.custo_medio))}</td>
                        <td className="py-2 pr-2 text-foreground">
                          {formatCurrency(roundToTwo(Number(product.quantidade_atual) * Number(product.custo_medio)))}
                        </td>
                        <td className="py-2 pr-2">
                          <ProductStatus product={product} />
                        </td>
                        <td className="py-2">
                          <ProductActions product={product} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {products.map((product) => (
                  <article key={product.id} className="space-y-3 rounded-xl border border-border bg-surface-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{product.nome}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          Saldo {formatQuantity(Number(product.quantidade_atual))} {product.unidade} | Min.{" "}
                          {formatQuantity(Number(product.estoque_minimo))} |{" "}
                          {formatCurrency(roundToTwo(Number(product.quantidade_atual) * Number(product.custo_medio)))}
                        </p>
                      </div>
                      <ProductStatus product={product} />
                    </div>
                    <ProductActions product={product} />
                  </article>
                ))}
              </div>
            </>
          )}

          <Pagination
            page={page}
            pageSize={PRODUCTS_PAGE_SIZE}
            total={productsTotal}
            hrefFor={(target) => buildHref({ ...productParams, pagina: target })}
          />
        </Panel>
      ) : (
        <Panel title="Movimentacoes" description="Historico de entradas e saidas do periodo.">
          <CollapsibleFilters summary={movementSummary} activeCount={movementActive}>
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input type="hidden" name="aba" value="movimentacoes" />
            <div className="space-y-1">
              <label htmlFor="estoque-start" className="text-sm text-foreground">
                Data inicial
              </label>
              <input id="estoque-start" name="start" type="date" defaultValue={start} className={FIELD_CLASS} required />
            </div>
            <div className="space-y-1">
              <label htmlFor="estoque-end" className="text-sm text-foreground">
                Data final
              </label>
              <input id="estoque-end" name="end" type="date" defaultValue={end} className={FIELD_CLASS} required />
            </div>
            <div className="space-y-1">
              <label htmlFor="estoque-produto" className="text-sm text-foreground">
                Produto
              </label>
              <select id="estoque-produto" name="produto" defaultValue={produtoId} className={FIELD_CLASS}>
                <option value="">Todos</option>
                {summaryProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="estoque-tipo" className="text-sm text-foreground">
                Tipo
              </label>
              <select id="estoque-tipo" name="tipo" defaultValue={tipo} className={FIELD_CLASS}>
                <option value="">Todos</option>
                <option value="entrada">Entrada</option>
                <option value="saida">Saida</option>
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className={`${BUTTON_CLASS} w-full`}>
                Filtrar
              </button>
            </div>
          </form>
          </CollapsibleFilters>

          {movements.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-muted-foreground">
              Nenhuma movimentacao encontrada.
            </p>
          ) : (
            <>
              <div className="hidden md:block">
                <table className="w-full table-fixed text-left text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="w-[14%] py-2 pr-2 font-medium">Data</th>
                      <th className="w-[20%] py-2 pr-2 font-medium">Produto</th>
                      <th className="py-2 pr-2 font-medium">Tipo</th>
                      <th className="py-2 pr-2 font-medium">Motivo</th>
                      <th className="py-2 pr-2 font-medium">Qtd</th>
                      <th className="py-2 pr-2 font-medium">Custo total</th>
                      <th className="w-[20%] py-2 font-medium">Observacao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((movement) => (
                      <tr key={movement.id} className="border-b border-border/60 align-middle">
                        <td className="py-2 pr-2 text-foreground">{formatDateTime(movement.data_movimento)}</td>
                        <td className="truncate py-2 pr-2 text-foreground">{getProductName(movement.products)}</td>
                        <td className="py-2 pr-2">
                          <StatusPill tone={movement.tipo === "entrada" ? "success" : "danger"}>
                            {movement.tipo === "entrada" ? "Entrada" : "Saida"}
                          </StatusPill>
                        </td>
                        <td className="py-2 pr-2 text-foreground">{REASON_LABELS[movement.motivo]}</td>
                        <td className="py-2 pr-2 text-foreground">
                          {formatQuantity(Number(movement.quantidade))} {getProductUnit(movement.products)}
                        </td>
                        <td className="py-2 pr-2 text-foreground">{formatCurrency(Number(movement.custo_total))}</td>
                        <td className="truncate py-2 text-muted-foreground" title={movement.observacao ?? undefined}>
                          {movement.observacao || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 md:hidden">
                {movements.map((movement) => (
                  <article key={movement.id} className="rounded-xl border border-border bg-surface-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-medium text-foreground">{getProductName(movement.products)}</p>
                      <StatusPill tone={movement.tipo === "entrada" ? "success" : "danger"}>
                        {movement.tipo === "entrada" ? "Entrada" : "Saida"}
                      </StatusPill>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {formatDateTime(movement.data_movimento)} | {REASON_LABELS[movement.motivo]} |{" "}
                      {formatQuantity(Number(movement.quantidade))} {getProductUnit(movement.products)} |{" "}
                      {formatCurrency(Number(movement.custo_total))}
                    </p>
                  </article>
                ))}
              </div>
            </>
          )}

          <Pagination
            page={page}
            pageSize={MOVEMENTS_PAGE_SIZE}
            total={movementsTotal}
            hrefFor={(target) => buildHref({ ...movementParams, pagina: target })}
          />
        </Panel>
      )}
    </div>
  );
}
