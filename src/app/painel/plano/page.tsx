import { redirect } from "next/navigation";
import { CreditCard } from "lucide-react";

import { AdherePlanForm } from "@/components/painel/plano/adhere-plan-form";
import { PageHeader } from "@/components/painel/ui/page-header";
import { Panel } from "@/components/painel/ui/panel";
import { StatusPill } from "@/components/painel/ui/status-pill";
import { canAccessModule, getAccessContext } from "@/lib/auth/access";
import { billingPill } from "@/lib/billing/labels";

export default async function PlanoPage() {
  const { supabase, companyId, role, redirectTo, billing } = await getAccessContext();

  if (!companyId || !role) {
    redirect(redirectTo ?? "/login");
  }

  if (!canAccessModule(role, "configuracoes")) {
    redirect("/painel");
  }

  const { data: company } = await supabase
    .from("companies")
    .select("documento")
    .eq("id", companyId)
    .maybeSingle();

  const isAdmin = role === "admin";
  const pill = billing ? billingPill(billing) : null;
  const trialDaysLeft = billing?.trialDaysLeft ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={CreditCard}
        title="Meu plano"
        description="Gerenie sua assinatura."
      />

      <Panel
        title="Status do plano"
        description="Informações sobre seu plano atual."
      >
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-sm text-muted-foreground">Status</p>
            {pill ? (
              <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
            ) : null}
          </div>

          {billing?.status === "trial" ? (
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Dias restantes</p>
              <p className="text-sm font-medium">{trialDaysLeft} dia{trialDaysLeft !== 1 ? "s" : ""}</p>
              <p className="mt-3 text-sm text-muted-foreground">
                Você tem acesso total durante o teste e pode contratar um plano a qualquer momento.
              </p>
            </div>
          ) : null}
        </div>
      </Panel>

      {isAdmin ? (
        <Panel
          title="Contratar plano"
          description="Preencha os dados abaixo para contratar um plano."
        >
          <AdherePlanForm documento={company?.documento ?? null} />
        </Panel>
      ) : (
        <Panel
          title="Contratação de plano"
          description="Entre em contato com o administrador da sua empresa."
        >
          <p className="text-sm text-muted-foreground">
            Fale com o administrador da sua empresa para contratar um plano.
          </p>
        </Panel>
      )}
    </div>
  );
}
