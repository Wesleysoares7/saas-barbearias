import Link from "next/link";

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params?: Record<string, string | undefined>;
};

const BUTTON_CLASS =
  "inline-flex min-h-11 items-center rounded-xl border border-border bg-surface-2 px-4 text-sm font-medium text-foreground hover:border-brand";

function hrefFor(basePath: string, params: Record<string, string | undefined>, page: number): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }

  if (page > 1) {
    search.set("pagina", String(page));
  }

  const query = search.toString();

  return query ? `${basePath}?${query}` : basePath;
}

export function parsePageParam(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function sanitizeSearchTerm(value: string | undefined): string {
  return (value ?? "").replace(/[,()%*\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function Pagination({ page, pageSize, total, basePath, params = {} }: PaginationProps) {
  if (total === 0) {
    return null;
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const disabledClass = `${BUTTON_CLASS} pointer-events-none opacity-50`;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Mostrando {from}-{to} de {total}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={hrefFor(basePath, params, page - 1)} className={BUTTON_CLASS}>
            Anterior
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">
            Anterior
          </span>
        )}
        {to < total ? (
          <Link href={hrefFor(basePath, params, page + 1)} className={BUTTON_CLASS}>
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