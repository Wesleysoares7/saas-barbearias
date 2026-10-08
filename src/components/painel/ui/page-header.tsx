import type { LucideIcon } from "lucide-react";

type PageHeaderProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ icon: Icon, title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand/15 text-brand">
          <Icon className="size-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
