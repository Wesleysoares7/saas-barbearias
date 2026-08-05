import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const { data: companyId } = await supabase.rpc("current_company_id");
  const { data: isPlatformAdmin, error: platformAdminError } = await supabase.rpc("is_platform_admin");

  if (companyId) {
    redirect("/painel");
  }

  if (!platformAdminError && isPlatformAdmin) {
    redirect("/master/empresas");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.25),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(255,255,255,0.08),_transparent_40%)]" />

      <section className="relative z-10 w-full max-w-lg rounded-2xl border border-amber-400/20 bg-zinc-900/85 p-6 shadow-2xl backdrop-blur sm:p-8">
        <div className="mb-6 space-y-2 text-center">
          <p className="text-xs font-semibold tracking-[0.22em] text-amber-300 uppercase">Primeiro acesso</p>
          <h1 className="text-2xl font-semibold text-zinc-100">Finalize o cadastro da sua empresa</h1>
          <p className="text-sm text-zinc-300">Vamos criar sua empresa e seu perfil administrador para liberar o acesso ao painel.</p>
        </div>

        <OnboardingForm />
      </section>
    </main>
  );
}
