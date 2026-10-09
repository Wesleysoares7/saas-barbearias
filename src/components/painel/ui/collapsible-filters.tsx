"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

type CollapsibleFiltersProps = {
  summary: string;
  activeCount: number;
  children: ReactNode;
};

export function CollapsibleFilters({ summary, activeCount, children }: CollapsibleFiltersProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 text-sm font-medium text-foreground md:hidden"
      >
        <SlidersHorizontal className="size-4 shrink-0" />
        <span className="shrink-0">Filtros</span>
        {activeCount > 0 ? (
          <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-semibold text-brand-foreground">
            {activeCount}
          </span>
        ) : null}
        <span className="min-w-0 flex-1 truncate text-left text-xs font-normal text-muted-foreground">{summary}</span>
        <ChevronDown className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={open ? "mt-3 block" : "hidden md:block"}>{children}</div>
    </div>
  );
}
