import type { ReactNode } from "react";

export type ListRowColumn = {
  label: string;
  value: string;
};

type ListRowProps = {
  leading?: string;
  title: string;
  subtitle?: string;
  columns?: ListRowColumn[];
  status?: ReactNode;
  actions: ReactNode;
  hideSubtitleOnDesktop?: boolean;
  time?: string;
  onOpen?: () => void;
  openLabel?: string;
};

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";

  return `${first}${last}`.toUpperCase();
}

export function ListRow({ leading, title, subtitle, columns, status, actions, hideSubtitleOnDesktop = false, time, onOpen, openLabel }: ListRowProps) {
  return (
    <div className="relative flex min-h-16 items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 hover:bg-surface-2">
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={openLabel ?? `Ver detalhes de ${title}`}
          className="absolute inset-0 rounded-xl focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        />
      ) : null}

      {time ? (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-sm font-semibold text-foreground">
          {time}
        </div>
      ) : null}

      {leading ? (
        <div
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand"
        >
          {leading}
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-foreground">{title}</p>
          {status ? <span className="shrink-0 md:hidden">{status}</span> : null}
        </div>
        {subtitle ? (
          <p className={`truncate text-xs text-muted-foreground ${hideSubtitleOnDesktop ? "md:hidden" : ""}`}>{subtitle}</p>
        ) : null}
      </div>

      {columns && columns.length > 0 ? (
        <div className="hidden shrink-0 items-center gap-6 md:flex">
          {columns.map((column) => (
            <div key={column.label} className="w-44 min-w-0">
              <p className="text-[10px] tracking-wide text-muted-foreground uppercase">{column.label}</p>
              <p className="truncate text-sm text-foreground">{column.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {status ? <div className="hidden shrink-0 md:block">{status}</div> : null}

      <div className="relative z-10 flex shrink-0 items-center gap-1">{actions}</div>
    </div>
  );
}

export const ROW_ICON_BUTTON_CLASS =
  "inline-flex size-11 items-center justify-center rounded-lg border border-border text-foreground transition hover:border-brand hover:text-brand md:size-9";