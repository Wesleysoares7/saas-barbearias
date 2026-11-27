import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MyBookings } from "./my-bookings";

import { getPublicCompany } from "@/lib/agendamento-publico/data";
import { getThemeCss } from "@/lib/themes";

import { BookingSteps } from "./booking-steps";

export const metadata: Metadata = {
  title: "Agendar horário",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function StepsSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-24 animate-pulse rounded-xl border border-border bg-surface"
        />
      ))}
    </div>
  );
}

export default async function AgendarPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const lookup = await getPublicCompany(slug);

  if (lookup.kind === "not_found") {
    notFound();
  }

  if (lookup.kind === "unavailable") {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-10 text-center">
        <h1 className="text-xl font-semibold text-foreground">
          Agendamento indisponível
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Este link de agendamento não está disponível no momento. Fale
          diretamente com a barbearia.
        </p>
      </main>
    );
  }

  const { company } = lookup;

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 sm:py-10">
      <style>{getThemeCss(company.tema)}</style>

      <header className="mb-5 flex items-center gap-3">
        {company.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={company.logoUrl}
            alt=""
            className="size-12 shrink-0 rounded-xl object-cover"
          />
        ) : null}
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-foreground">
            {company.nome}
          </h1>
          <p className="text-sm text-muted-foreground">Agende seu horário</p>
        </div>
      </header>

      <MyBookings slug={company.slug} />

      <Suspense key={JSON.stringify(query)} fallback={<StepsSkeleton />}>
        <BookingSteps company={company} query={query} />
      </Suspense>
    </main>
  );
}
