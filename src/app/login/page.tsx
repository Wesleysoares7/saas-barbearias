import { Suspense } from "react";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.25),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(255,255,255,0.08),_transparent_40%)]" />

      <section className="relative z-10 w-full max-w-md rounded-2xl border border-amber-400/20 bg-zinc-900/85 p-6 shadow-2xl backdrop-blur sm:p-8">
        <div className="mb-6 space-y-2 text-center">
          <p className="text-xs font-semibold tracking-[0.22em] text-amber-300 uppercase">SaaS Barbearias</p>
          <h1 className="text-2xl font-semibold text-zinc-100">Acesse sua conta</h1>
          <p className="text-sm text-zinc-300">Entre para continuar a gestao da sua barbearia.</p>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <div className="mt-5 border-t border-zinc-700/70 pt-4 text-center">
          <p className="text-xs text-zinc-400">Cliente da barbearia?</p>
          <Link href="/agendar" className="mt-1 inline-block text-sm font-medium text-fuchsia-300 transition hover:text-fuchsia-200">
            Agendar como cliente
          </Link>
        </div>
      </section>
    </main>
  );
}
