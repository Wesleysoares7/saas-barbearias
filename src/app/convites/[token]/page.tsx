import Link from "next/link";
import { redirect } from "next/navigation";

import { AcceptTeamInviteForm } from "@/components/invites/accept-team-invite-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTimeBR } from "@/lib/datetime";

type InviteStatus = "pending" | "accepted" | "revoked" | "expired";

type InvitePreview = {
  email: string;
  role: "admin" | "employee";
  status: InviteStatus;
  expires_at: string;
  companies: { nome: string } | null;
};

function formatDate(value: string): string {
  const formatted = formatDateTimeBR(value);

  return formatted === "-" ? value : formatted;
}

export default async function InviteTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(`/login?next=/convites/${token}`);
  }

  const inviteResponse = await supabase
    .from("team_invites")
    .select("email, role, status, expires_at, companies(nome)")
    .eq("token", token)
    .maybeSingle();

  const invite = (inviteResponse.data ?? null) as InvitePreview | null;
  const hasInviteTableIssue = Boolean(inviteResponse.error?.message.includes("team_invites"));

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.22),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(255,255,255,0.08),_transparent_40%)]" />

      <section className="relative z-10 w-full max-w-xl rounded-2xl border border-amber-400/20 bg-zinc-900/85 p-6 shadow-2xl backdrop-blur sm:p-8">
        <h1 className="text-2xl font-semibold text-zinc-100">Aceitar convite</h1>
        <p className="mt-2 text-sm text-zinc-300">Confirme sua entrada para acessar o sistema da empresa convidante.</p>

        {hasInviteTableIssue ? (
          <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-600/10 p-4 text-sm text-amber-200">
            Este recurso está temporariamente indisponível. Tente novamente em instantes.
          </p>
        ) : null}

        {invite ? (
          <div className="mt-4 space-y-2 rounded-lg border border-zinc-700/70 bg-zinc-950/70 p-4 text-sm">
            <p className="text-zinc-200">
              <span className="text-zinc-400">Empresa:</span> {invite.companies?.nome ?? "Empresa"}
            </p>
            <p className="text-zinc-200">
              <span className="text-zinc-400">Convidado:</span> {invite.email}
            </p>
            <p className="text-zinc-200">
              <span className="text-zinc-400">Papel:</span> {invite.role === "admin" ? "Administrador" : "Equipe"}
            </p>
            <p className="text-zinc-200">
              <span className="text-zinc-400">Status:</span> {invite.status}
            </p>
            <p className="text-zinc-200">
              <span className="text-zinc-400">Expira em:</span> {formatDate(invite.expires_at)}
            </p>
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-zinc-700/70 bg-zinc-950/70 p-4 text-sm text-zinc-300">
            Convite nao encontrado para este token.
          </p>
        )}

        <div className="mt-5">
          <AcceptTeamInviteForm token={token} />
        </div>

        <div className="mt-4">
          <Link
            href="/painel"
            className="text-sm text-zinc-300 underline decoration-zinc-600 underline-offset-4 hover:text-amber-300"
          >
            Voltar ao painel
          </Link>
        </div>
      </section>
    </main>
  );
}
