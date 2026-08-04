import Link from "next/link";

import { BookingEntryForm } from "@/components/public-booking/booking-entry-form";

export default function PublicBookingEntryPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(236,72,153,0.25),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.14),_transparent_40%)]" />

      <section className="relative z-10 mx-auto w-full max-w-md rounded-2xl border border-fuchsia-400/20 bg-zinc-900/85 p-6 shadow-2xl backdrop-blur sm:p-8">
        <div className="mb-6 space-y-2 text-center">
          <p className="text-xs font-semibold tracking-[0.22em] text-fuchsia-300 uppercase">Agendamento de cliente</p>
          <h1 className="text-2xl font-semibold text-zinc-100">Marcar horario</h1>
          <p className="text-sm text-zinc-300">Digite o codigo da barbearia para continuar.</p>
        </div>

        <BookingEntryForm />

        <div className="mt-5 border-t border-zinc-700/70 pt-4 text-center">
          <Link href="/login" className="text-xs text-zinc-400 transition hover:text-zinc-200">
            Voltar para area interna
          </Link>
        </div>
      </section>
    </main>
  );
}
