import { Suspense } from "react";
import { Fraunces } from "next/font/google";

import { LoginForm } from "@/components/auth/login-form";
import { BrandMark } from "@/components/brand/brand-mark";
import {
  BRAND_KICKER,
  BRAND_HEADLINE_1,
  BRAND_HEADLINE_2,
  BRAND_DESCRIPTION,
} from "@/lib/brand";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  weight: "700",
  subsets: ["latin"],
});

function Wordmark({ markSize, textClass }: Readonly<{ markSize: number; textClass: string }>) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-brand">
        <BrandMark size={markSize} />
      </div>
      <p className={`${fraunces.className} ${textClass} font-bold`}>
        <span className="text-foreground">sua</span>
        <span className="text-brand">vez</span>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main
      className={`${fraunces.variable} relative min-h-screen overflow-hidden bg-background`}
      style={{
        backgroundImage:
          "radial-gradient(circle at top, rgba(217, 119, 6, 0.25), transparent 45%), radial-gradient(circle at bottom, rgba(255, 255, 255, 0.08), transparent 40%)",
      }}
    >
      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-16 xl:gap-24">
        <section className="hidden flex-col items-start justify-center lg:flex">
          <div className="mb-10">
            <Wordmark markSize={44} textClass="text-4xl" />
          </div>

          <p className="mb-3 text-xs font-semibold tracking-[0.22em] text-brand uppercase">
            {BRAND_KICKER}
          </p>

          <p className={`${fraunces.className} mb-4 text-4xl leading-tight font-bold lg:text-5xl`}>
            {BRAND_HEADLINE_1}
            <br />
            {BRAND_HEADLINE_2}
          </p>

          <p className="mb-10 max-w-xl text-muted-foreground">{BRAND_DESCRIPTION}</p>

          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6">
            <p className="mb-4 text-xs font-semibold text-muted-foreground">HOJE · EXEMPLO</p>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <span className="w-14 shrink-0 font-bold tabular-nums text-brand">09:00</span>
                <span className="text-sm text-foreground">Corte e barba</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-14 shrink-0 font-bold tabular-nums text-[#F2A7A0]">10:30</span>
                <span className="text-sm text-foreground">Coloração</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-14 shrink-0 font-bold tabular-nums text-brand">14:00</span>
                <span className="text-sm text-foreground">Escova</span>
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col items-center justify-center">
          <div className="mb-6 lg:hidden">
            <Wordmark markSize={36} textClass="text-3xl" />
          </div>

          <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl backdrop-blur sm:p-8 lg:mx-0 lg:max-w-none">
            <div className="mb-6 space-y-2 text-center">
              <h1 className="text-2xl font-semibold text-foreground">Chegou a sua vez</h1>
              <p className="text-sm text-muted-foreground">Entre para abrir a agenda de hoje.</p>
            </div>

            <Suspense
              fallback={
                <div className="space-y-4" aria-hidden="true">
                  <div className="h-11 animate-pulse rounded-lg bg-muted" />
                  <div className="h-11 animate-pulse rounded-lg bg-muted" />
                  <div className="h-11 animate-pulse rounded-lg bg-brand/40" />
                </div>
              }
            >
              <LoginForm />
            </Suspense>
          </div>
        </section>
      </div>
    </main>
  );
}
