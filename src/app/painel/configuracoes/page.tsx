import { redirect } from "next/navigation";
import { Settings } from "lucide-react";

import { CompanyInfoForm } from "@/components/painel/configuracoes/company-info-form";
import { LogoForm } from "@/components/painel/configuracoes/logo-form";
import { ThemeForm } from "@/components/painel/configuracoes/theme-form";
import { PageHeader } from "@/components/painel/ui/page-header";
import { Panel } from "@/components/painel/ui/panel";
import { canAccessModule, getAccessContext } from "@/lib/auth/access";
import { getTheme } from "@/lib/themes";

export default async function ConfiguracoesPage() {
  const { supabase, companyId, role, redirectTo } = await getAccessContext();

  if (!companyId || !role) {
    redirect(redirectTo ?? "/login");
  }

  if (!canAccessModule(role, "configuracoes")) {
    redirect("/painel");
  }

  const { data: company, error } = await supabase
    .from("companies")
    .select("nome, telefone, endereco, cidade, uf, email_contato, logo, tema, documento")
    .eq("id", companyId)
    .maybeSingle();

  if (error) {
    console.error(error.code, error.message);
  }

  const logoPath =
    typeof company?.logo === "string" && company.logo ? company.logo : null;
  const logoUrl = logoPath
    ? supabase.storage.from("company-logos").getPublicUrl(logoPath).data
        .publicUrl
    : null;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Settings}
        title="Configuracoes"
        description="Ajustes da sua empresa."
      />

      <Panel
        title="Dados da empresa"
        description="Informações de contato da sua empresa."
      >
        <CompanyInfoForm
          company={{
            nome: company?.nome ?? null,
            telefone: company?.telefone ?? null,
            endereco: company?.endereco ?? null,
            cidade: company?.cidade ?? null,
            uf: company?.uf ?? null,
            email_contato: company?.email_contato ?? null,
            documento: company?.documento ?? null,
          }}
        />
      </Panel>

      <Panel
        title="Logo da empresa"
        description="Aparece para identificar sua empresa no painel."
      >
        <LogoForm
          logoUrl={logoUrl}
          companyName={company?.nome ?? "Minha empresa"}
        />
      </Panel>

      <Panel
        title="Tema de cores"
        description="Escolha a cor de destaque do painel. Vale para todos os usuarios da empresa."
      >
        <ThemeForm currentTheme={getTheme(company?.tema).value} />
      </Panel>
    </div>
  );
}
