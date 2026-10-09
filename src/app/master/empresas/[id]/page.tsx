import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, CalendarDays, DollarSign, Package, Scissors, UserCog, Users } from "lucide-react";

import { startSupportSessionAction, updateMasterCompanyAction } from "@/app/master/actions";
import { PageHeader } from "@/components/painel/ui/page-header";
import { Panel } from "@/components/painel/ui/panel";
import { StatCard } from "@/components/painel/ui/stat-card";
import { StatusPill } from "@/components/painel/ui/status-pill";
import { getPlatformAccessContext } from "@/lib/auth/access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FIELD_CLASS =
  "h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-base text-foreground outline-none focus:border-brand";

type CompanyRow = {
  id: string;
  nome: string;
  telefone: string | null;
  endereco: string | null;
};

type MemberRow = {
  id: string;
  nome: string | null;
  email: string | null;
  role: string;
};

type AuditRow = {
  id: string;
  action: string;
  entity: string;
  created_at: string;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

export default async function MasterCompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { isPlatformAdmin, redirectTo } = await getPlatformAccessContext();

  if (redirectTo || !isPlatformAdmin) {
    redirect(redirectTo ?? "/painel");
  }

  if (!UUID_PATTERN.test(id)) {
    redirect("/master/empresas");
  }

  const admin = createSupabaseAdminClient();
  const countOf = (table: string) =>
    admin.from(table).select("id", { count: "exact", head: true }).eq("company_id", id);

  const [companyResponse, memberCount, employees, services, customers, appointments, products, payments, membersResponse, logs] =
    await Promise.all([
      admin.from("companies").select("id, nome, telefone, endereco").eq("id", id).maybeSingle(),
      countOf("profiles"),
      countOf("employees"),
      countOf("services"),
      countOf("customers"),
      countOf("appointments"),
      countOf("products"),
      admin.from("payments").select("valor").eq("company_id", id),
      admin.from("profiles").select("id, nome, email, role").eq("company_id", id).order("nome", { ascending: true }),
      admin
        .from("audit_logs")
        .select("id, action, entity, created_at")
        .eq("company_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const company = companyResponse.data as CompanyRow | null;

  if (!company) {
    redirect("/master/empresas");
  }

  const totalPayments = ((payments.data ?? []) as { valor: number | string }[]).reduce(
    (sum, item) => sum + Number(item.valor),
    0,
  );
  const memberList = (membersResponse.data ?? []) as MemberRow[];
  const logList = (logs.data ?? []) as AuditRow[];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-6 pb-24 sm:px-6">
      <Link href="/master/empresas" className="inline-flex min-h-11 items-center text-sm text-brand">
        Voltar para empresas
      </Link>

      <PageHeader
        icon={Building2}
        title={company.nome}
        description="Detalhes da empresa e acesso de suporte."
        actions={
          <form action={startSupportSessionAction}>
            <input type="hidden" name="companyId" value={company.id} />
            <button
              type="submit"
              className="min-h-11 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-foreground hover:bg-brand/90"
            >
              Entrar em modo suporte
            </button>
          </form>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Membros" value={memberCount.count ?? 0} icon={Users} />
        <StatCard label="Funcionarios" value={employees.count ?? 0} icon={UserCog} />
        <StatCard label="Servicos" value={services.count ?? 0} icon={Scissors} />
        <StatCard label="Clientes" value={customers.count ?? 0} icon={Users} />
        <StatCard label="Agendamentos" value={appointments.count ?? 0} icon={CalendarDays} />
        <StatCard label="Produtos" value={products.count ?? 0} icon={Package} />
        <StatCard
          label="Total em pagamentos"
          value={formatCurrency(totalPayments)}
          icon={DollarSign}
          className="col-span-2"
        />
      </div>

      <Panel title="Dados">
        <form action={updateMasterCompanyAction} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="id" value={company.id} />
          <div className="space-y-1 md:col-span-2">
            <label htmlFor="empresa-nome" className="text-sm text-foreground">
              Nome
            </label>
            <input id="empresa-nome" name="nome" required minLength={2} defaultValue={company.nome} className={FIELD_CLASS} />
          </div>
          <div className="space-y-1">
            <label htmlFor="empresa-telefone" className="text-sm text-foreground">
              Telefone
            </label>
            <input id="empresa-telefone" name="telefone" defaultValue={company.telefone ?? ""} className={FIELD_CLASS} />
          </div>
          <div className="space-y-1">
            <label htmlFor="empresa-endereco" className="text-sm text-foreground">
              Endereco
            </label>
            <input id="empresa-endereco" name="endereco" defaultValue={company.endereco ?? ""} className={FIELD_CLASS} />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="min-h-11 rounded-xl border border-border bg-surface-2 px-4 text-sm font-medium text-foreground transition hover:border-brand hover:text-brand"
            >
              Salvar alteracoes
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="Membros">
        {memberList.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum membro cadastrado.</p>
        ) : (
          <ul className="space-y-2">
            {memberList.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface-2 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{member.nome ?? "Sem nome"}</p>
                  <p className="truncate text-xs text-muted-foreground">{member.email ?? "-"}</p>
                </div>
                <StatusPill tone={member.role === "admin" ? "success" : "neutral"}>
                  {member.role === "admin" ? "Admin" : "Equipe"}
                </StatusPill>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Ultimas 10 atividades">
        {logList.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
        ) : (
          <ul className="space-y-2">
            {logList.map((log) => (
              <li key={log.id} className="rounded-xl border border-border bg-surface-2 p-3">
                <p className="truncate text-sm text-foreground">{log.action}</p>
                <p className="text-xs text-muted-foreground">
                  {log.entity} | {formatDateTime(log.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
