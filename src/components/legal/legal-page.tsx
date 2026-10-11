import Link from "next/link";
import type { ReactNode } from "react";

import { hasLegalPlaceholders, LEGAL } from "@/lib/legal";

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const showDevWarning =
    process.env.NODE_ENV !== "production" && hasLegalPlaceholders();

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-300">
      <article className="mx-auto w-full max-w-3xl space-y-8">
        <header className="space-y-2 border-b border-zinc-800 pb-6">
          <Link
            href="/login"
            className="text-sm text-amber-300 hover:text-amber-200"
          >
            ← Voltar
          </Link>
          <h1 className="text-3xl font-semibold text-zinc-100">{title}</h1>
          <p className="text-sm text-zinc-400">
            Versão {LEGAL.versao} · Em vigor desde {LEGAL.vigencia}
          </p>
        </header>

        {showDevWarning ? (
          <p className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200">
            Aviso (somente em desenvolvimento): ainda há campos [PREENCHER] em
            src/lib/legal.ts.
          </p>
        ) : null}

        {children}

        <footer className="flex flex-wrap gap-4 border-t border-zinc-800 pt-6 text-sm">
          <Link href="/termos" className="text-amber-300 hover:text-amber-200">
            Termos de Uso
          </Link>
          <Link
            href="/privacidade"
            className="text-amber-300 hover:text-amber-200"
          >
            Política de Privacidade
          </Link>
        </footer>
      </article>
    </main>
  );
}

export function LegalSection({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-zinc-100">
        {n}. {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
        {children}
      </div>
    </section>
  );
}
