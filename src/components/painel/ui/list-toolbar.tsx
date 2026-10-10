import { Search } from "lucide-react";

type ListToolbarProps = {
  placeholder: string;
  defaultValue?: string;
};

export function ListToolbar({ placeholder, defaultValue = "" }: ListToolbarProps) {
  return (
    <form method="get" className="flex gap-2">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder={placeholder}
          aria-label={placeholder}
          maxLength={80}
          className="min-h-11 w-full rounded-xl border border-border bg-surface-2 pr-3 pl-9 text-base text-foreground outline-none focus:border-brand"
        />
      </div>
      <button
        type="submit"
        className="min-h-11 shrink-0 rounded-xl bg-brand px-4 text-sm font-medium text-brand-foreground hover:bg-brand/90"
      >
        Buscar
      </button>
    </form>
  );
}