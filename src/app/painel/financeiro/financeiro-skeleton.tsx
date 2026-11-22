export function FinanceiroSkeleton() {
  return (
    <div className="space-y-4 pb-24">
      {/* Resumo - 4 indicadores */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="min-h-14 min-w-0 rounded-xl border border-border bg-surface px-3 py-2 animate-pulse"
          >
            <div className="h-3 w-16 bg-skeleton rounded mb-2" />
            <div className="h-5 w-24 bg-skeleton rounded" />
          </div>
        ))}
      </div>

      {/* Painel grande */}
      <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
        <div className="space-y-1">
          <div className="h-5 w-32 bg-skeleton rounded animate-pulse" />
          <div className="h-4 w-64 bg-skeleton rounded animate-pulse" />
        </div>

        {/* Conteúdo do painel */}
        <div className="space-y-3 mt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 py-2 animate-pulse"
            >
              <div className="h-4 w-32 bg-skeleton rounded" />
              <div className="h-4 w-20 bg-skeleton rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
