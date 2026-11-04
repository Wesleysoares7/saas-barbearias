import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.25),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(255,255,255,0.08),_transparent_40%)]" />

      <section className="relative z-10 w-full max-w-md rounded-2xl border border-amber-400/20 bg-zinc-900/85 p-6 shadow-2xl backdrop-blur sm:p-8">
        <div className="mb-6 space-y-2 text-center">
          <p className="text-xs font-semibold tracking-[0.22em] text-amber-300 uppercase">SaaS Agenda de Servicos</p>
          <h1 className="text-2xl font-semibold text-zinc-100">Acesse sua conta</h1>
          <p className="text-sm text-zinc-300">Entre para continuar a gestao do seu negocio.</p>
        </div>

        <Suspense
          fallback={
            <div className="space-y-4" aria-hidden="true">
              <div className="h-11 animate-pulse rounded-lg bg-zinc-800/70" />
              <div className="h-11 animate-pulse rounded-lg bg-zinc-950/80" />
              <div className="h-11 animate-pulse rounded-lg bg-amber-400/40" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
