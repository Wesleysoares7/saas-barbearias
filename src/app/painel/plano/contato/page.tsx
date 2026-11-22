import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";

import { canAccessModule, getAccessContext, isAdmin } from "@/lib/auth/access";
import { getSupportContact, whatsappLink } from "@/lib/billing/contact";
import { billingPill } from "@/lib/billing/labels";
import { BRAND_NAME } from "@/lib/brand";
import { maskDocumento } from "@/lib/documento";
import { PageHeader } from "@/components/painel/ui/page-header";
import { Panel } from "@/components/painel/ui/panel";
import { StatusPill } from "@/components/painel/ui/status-pill";

const STEPS = [
  "Uma conversa rápida para escolher o plano",
  "Você recebe a forma de pagamento",
  "Liberamos sua conta",
];

export default async function ContatoPage() {
  const { supabase, companyId, role, redirectTo, billing } =
    await getAccessContext({ allowLimited: true });

  if (!companyId || !role) {
    redirect(redirectTo ?? "/login");
  }

  if (!canAccessModule(role, "configuracoes") || !isAdmin(role)) {
    redirect("/painel/plano");
  }

  const { data: company, error } = await supabase
    .from("companies")
    .select("id, nome, documento")
    .eq("id", companyId)
    .maybeSingle();

  if (error) {
    console.error("plano_contato_error", error.code);
  }

  if (!company?.documento) {
    redirect("/painel/plano");
  }

  const support = getSupportContact();
  const pill = billing ? billingPill(billing) : null;
  const trialDaysLeft = billing?.trialDaysLeft ?? 0;

  const message = `Olá! Sou da ${company.nome} e quero contratar um plano do ${BRAND_NAME}.`;
  const mailtoHref = `mailto:${support.email ?? ""}?subject=${encodeURIComponent("Contratar plano")}&body=${encodeURIComponent(message)}`;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={MessageCircle}
        title="Falta pouco para contratar"
        description="Escolha como prefere falar com a gente."
      />

      <Panel title="Seus dados" description="Informações da sua empresa.">
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-sm text-muted-foreground">
              Nome da empresa
            </p>
            <p className="text-sm font-medium">{company.nome}</p>
          </div>

          <div>
            <p className="mb-1 text-sm text-muted-foreground">Documento</p>
            <p className="text-sm font-medium">
              {maskDocumento(company.documento)}
            </p>
          </div>

          <div>
            <p className="mb-1 text-sm text-muted-foreground">
              Status do plano
            </p>
            {pill ? (
              <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
            ) : null}
          </div>

          {billing?.status === "trial" ? (
            <div>
              <p className="mb-1 text-sm text-muted-foreground">
                Período de teste
              </p>
              <p className="text-sm font-medium">
                {trialDaysLeft} dia{trialDaysLeft === 1 ? "" : "s"} de teste
                restantes
              </p>
            </div>
          ) : null}
        </div>
      </Panel>

      <Panel
        title="Fale com a gente"
        description="Escolha o canal de contato que prefere."
      >
        {support.whatsapp || support.email ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            {support.whatsapp ? (
              <a
                href={whatsappLink(support.whatsapp, message)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90"
              >
                Falar pelo WhatsApp
              </a>
            ) : null}

            {support.email ? (
              <a
                href={mailtoHref}
                className="flex min-h-11 items-center justify-center rounded-lg border border-brand px-4 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand/10"
              >
                Enviar e-mail
              </a>
            ) : null}
          </div>
        ) : (
          <p
            className="rounded-lg border border-amber-500/50 bg-amber-600/15 px-4 py-3 text-sm text-amber-200"
            aria-live="polite"
          >
            Os canais de contato serão disponibilizados em breve.
          </p>
        )}
      </Panel>

      <Panel
        title="Como funciona"
        description="Próximos passos para contratar o plano."
      >
        <ol className="space-y-4">
          {STEPS.map((step, index) => (
            <li key={step} className="flex items-center gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand">
                {index + 1}
              </span>
              <span className="text-sm font-medium">{step}</span>
            </li>
          ))}
        </ol>

        {billing?.status === "trial" ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Você continua com acesso total durante o teste.
          </p>
        ) : null}
      </Panel>

      <Link
        href="/painel/plano"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-brand hover:text-brand/80"
      >
        <ArrowLeft className="size-4" />
        Voltar para Meu plano
      </Link>
    </div>
  );
}
