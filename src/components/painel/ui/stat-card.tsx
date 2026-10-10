import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  className?: string;
  tone?: "default" | "success" | "warning" | "danger";
};

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-brand",
  success: "text-emerald-400",
  warning: "text-amber-400",
  danger: "text-rose-400",
};

export function StatCard({ label, value, hint, icon: Icon, className = "", tone = "default" }: StatCardProps) {
  return (
    <article className={`min-w-0 overflow-hidden rounded-2xl border border-border bg-surface p-4 ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon ? <Icon className={`size-4 ${toneClasses[tone]}`} /> : null}
      </div>
      <p className={`mt-2 min-w-0 text-xl font-bold break-words tabular-nums sm:text-3xl ${tone === "default" ? "text-foreground" : toneClasses[tone]}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </article>
  );
}
