export default function Loading() {
  return (
    <div className="space-y-5 pb-24" aria-busy="true" aria-label="Carregando">
      <div className="flex items-center gap-3">
        <div className="size-12 shrink-0 animate-pulse rounded-2xl bg-surface-2" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-1/2 animate-pulse rounded-2xl bg-surface-2" />
          <div className="h-3 w-3/4 animate-pulse rounded-2xl bg-surface-2" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="h-20 animate-pulse rounded-2xl bg-surface-2" />
        <div className="h-20 animate-pulse rounded-2xl bg-surface-2" />
        <div className="col-span-2 h-20 animate-pulse rounded-2xl bg-surface-2 sm:col-span-1" />
      </div>

      <div className="h-72 animate-pulse rounded-2xl bg-surface-2" />
    </div>
  );
}