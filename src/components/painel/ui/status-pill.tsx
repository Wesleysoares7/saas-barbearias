type StatusPillProps = {
  tone: "success" | "warning" | "danger" | "brand" | "neutral";
  children: React.ReactNode;
};

const toneClasses: Record<StatusPillProps["tone"], string> = {
  success: "bg-emerald-400/15 text-emerald-300",
  warning: "bg-amber-400/15 text-amber-300",
  danger: "bg-rose-400/15 text-rose-300",
  brand: "bg-brand/15 text-brand",
  neutral: "bg-white/10 text-muted-foreground",
};

export function StatusPill({ tone, children }: StatusPillProps) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}>{children}</span>;
}
