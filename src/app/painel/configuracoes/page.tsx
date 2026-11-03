import { redirect } from "next/navigation";
import { Settings } from "lucide-react";

import { LogoForm } from "@/components/painel/configuracoes/logo-form";
import { PageHeader } from "@/components/painel/ui/page-header";
import { Panel } from "@/components/painel/ui/panel";
import { canAccessModule, getAccessContext } from "@/lib/auth/access";

export default async function ConfiguracoesPage() {
  const { supabase, companyId, role, redirectTo } = await getAccessContext();

  if (!companyId || !role) {
    redirect(redirectTo ?? "/login");
  }

  if (!canAccessModule(role, "configuracoes")) {
    redirect("/painel");
  }

  const { data: company } = await supabase
    .from("companies")
    .select("nome, logo")
    .eq("id", companyId)
    .maybeSingle();

  const logoPath = typeof company?.logo === "string" && company.logo ? company.logo : null;
  const logoUrl = logoPath ? supabase.storage.from("company-logos").getPublicUrl(logoPath).data.publicUrl : null;

  return (
    <div className="space-y-5">
      <PageHeader icon={Settings} title="Configuracoes" description="Ajustes da sua empresa." />

      <Panel title="Logo da empresa" description="Aparece para identificar sua empresa no painel.">
        <LogoForm logoUrl={logoUrl} companyName={company?.nome ?? "Minha empresa"} />
      </Panel>
    </div>
  );
}
