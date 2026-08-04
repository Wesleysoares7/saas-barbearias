import Link from "next/link";
import { redirect } from "next/navigation";

import { PublicBookingSettingsForm } from "@/components/painel/public-booking/public-booking-settings-form";
import { getAccessContext, isAdmin } from "@/lib/auth/access";

type CompanyPublicSettings = {
  nome: string;
  public_slug: string | null;
  public_booking_enabled: boolean | null;
};

export default async function PublicoPage() {
  const { supabase, companyId, role, redirectTo } = await getAccessContext();

  if (!companyId || !role) {
    redirect(redirectTo ?? "/login");
  }

  if (!isAdmin(role)) {
    redirect("/painel");
  }

  const { data: company, error } = await supabase
    .from("companies")
    .select("nome, public_slug, public_booking_enabled")
    .eq("id", companyId)
    .maybeSingle();

  const columnMissing = Boolean(error?.message?.includes("public_slug"));

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(217,70,239,0.2),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.12),_transparent_40%)]" />

      <section className="relative z-10 mx-auto w-full max-w-3xl space-y-5 rounded-2xl border border-fuchsia-400/20 bg-zinc-900/85 p-6 shadow-2xl backdrop-blur sm:p-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">Canal publico de agendamento</h1>
            <p className="mt-1 text-sm text-zinc-300">Configure um link para seus clientes marcarem horarios sem acessar o painel.</p>
          </div>

          <Link
            href="/painel"
            className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200 transition hover:border-fuchsia-400 hover:text-fuchsia-300"
          >
            Voltar ao painel
          </Link>
        </header>

        {columnMissing ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-600/10 p-4 text-sm text-amber-200">
            Seu banco ainda nao possui as colunas do canal publico. Execute o script
            {" "}
            <span className="font-semibold">docs/database/008_etapa15_agendamento_publico.sql</span>
            {" "}
            no Supabase SQL Editor e recarregue esta tela.
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-zinc-700/60 bg-zinc-950/60 p-4">
              <p className="text-xs text-zinc-400">Empresa</p>
              <p className="mt-1 text-sm text-zinc-100">{(company as CompanyPublicSettings | null)?.nome ?? "Empresa nao encontrada"}</p>
              <p className="mt-3 text-xs text-zinc-400">Link atual</p>
              {(company as CompanyPublicSettings | null)?.public_slug ? (
                <p className="mt-1 text-sm text-fuchsia-200">/agendar/{(company as CompanyPublicSettings).public_slug}</p>
              ) : (
                <p className="mt-1 text-sm text-zinc-400">Ainda nao configurado.</p>
              )}
            </div>

            <PublicBookingSettingsForm
              initialSlug={(company as CompanyPublicSettings | null)?.public_slug ?? ""}
              initialEnabled={Boolean((company as CompanyPublicSettings | null)?.public_booking_enabled)}
            />
          </>
        )}
      </section>
    </main>
  );
}
