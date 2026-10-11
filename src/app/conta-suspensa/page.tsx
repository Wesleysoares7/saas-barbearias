import { redirect } from "next/navigation";

import { signOutAction } from "@/app/painel/actions";
import { getAccountStatusContext } from "@/lib/auth/access";
import { blockedMessage } from "@/lib/billing/state";
import { getSupportContact, whatsappLink } from "@/lib/billing/contact";

const TITLES = {
  suspended: "Conta suspensa",
  trial_expired: "Periodo de teste encerrado",
  canceled: "Conta encerrada",
} as const;

const ACTION_CLASS =
  "inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold";

export default async function ContaSuspensaPage() {
  const { userId, role, billing, isPlatformAdmin } = await getAccountStatusContext();

  if (!userId) {
    redirect("/login");
  }

  if (!billing?.blocked || isPlatformAdmin) {
    redirect("/painel");
  }

  const reason = billing.blockReason;
  const title = reason ? TITLES[reason] : "Acesso indisponivel";
  const contact = getSupportContact();
  const hasContact = Boolean(contact.whatsapp || contact.email);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.25),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(255,255,255,0.08),_transparent_40%)]" />

      <section className="relative z-10 w-full max-w-md space-y-5 rounded-2xl border border-amber-400/20 bg-zinc-900/85 p-6 shadow-2xl backdrop-blur sm:p-8">
        <div className="space-y-2 text-center">
          <p className="text-xs font-semibold tracking-[0.22em] text-amber-300 uppercase">SaaS Agenda de Servicos</p>
          <h1 className="text-2xl font-semibold text-zinc-100">{title}</h1>
          <p className="text-sm text-zinc-300">{blockedMessage(reason)}</p>
          {reason === "canceled" ? (
            <p className="text-sm text-zinc-400">Seus dados serao tratados conforme os Termos de uso.</p>
          ) : null}
        </div>

        <div className="space-y-3">
          {contact.whatsapp ? (
            <a
              href={whatsappLink(contact.whatsapp)}
              target="_blank"
              rel="noreferrer"
              className={`${ACTION_CLASS} bg-amber-400 text-zinc-950 hover:bg-amber-300`}
            >
              Falar pelo WhatsApp
            </a>
          ) : null}
          {contact.email ? (
            <a
              href={`mailto:${contact.email}`}
              className={`${ACTION_CLASS} border border-zinc-700 text-zinc-100 hover:bg-zinc-800`}
            >
              {contact.email}
            </a>
          ) : null}
          {!hasContact ? <p className="text-center text-sm text-zinc-300">Entre em contato com o suporte.</p> : null}

          {role === "admin" ? (
            <a
              href="/api/account/export"
              download
              className={`${ACTION_CLASS} border border-zinc-700 text-zinc-100 hover:bg-zinc-800`}
            >
              Exportar meus dados
            </a>
          ) : (
            <p className="text-center text-sm text-zinc-300">Fale com o administrador da sua empresa.</p>
          )}

          <form action={signOutAction}>
            <button type="submit" className={`${ACTION_CLASS} text-zinc-300 hover:bg-zinc-800`}>
              Sair
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}