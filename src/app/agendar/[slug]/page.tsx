import { PublicBookingForm } from "@/components/public-booking/public-booking-form";

type PublicBookingPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PublicBookingPage({ params }: PublicBookingPageProps) {
  const { slug } = await params;

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(236,72,153,0.25),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.14),_transparent_40%)]" />

      <section className="relative z-10 mx-auto w-full max-w-3xl rounded-2xl border border-fuchsia-400/20 bg-zinc-900/85 p-6 shadow-2xl backdrop-blur sm:p-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-100">Agende seu horario</h1>
          <p className="mt-2 text-sm text-zinc-300">Escolha servico, profissional e horario disponivel para solicitar seu atendimento.</p>
        </header>

        <PublicBookingForm slug={slug} />
      </section>
    </main>
  );
}
