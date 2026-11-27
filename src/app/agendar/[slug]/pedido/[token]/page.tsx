import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatBookingCode } from "@/lib/agendamento-publico/booking-code";
import {
  getPublicBooking,
  type PublicBooking,
} from "@/lib/agendamento-publico/data";
import { getThemeCss } from "@/lib/themes";

import { AutoRefresh } from "./auto-refresh";
import { CancelButton } from "./cancel-button";

export const metadata: Metadata = {
  title: "Acompanhar pedido",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ slug: string; token: string }>;
};

const STATUS_VIEW: Record<
  PublicBooking["appointment"]["status"],
  { label: string; text: string; className: string }
> = {
  aguardando: {
    label: "Aguardando confirmação",
    text: "A barbearia ainda vai confirmar o seu horário. O pedido só vale depois da confirmação.",
    className: "border-amber-500/40 bg-amber-600/10 text-amber-200",
  },
  agendado: {
    label: "Confirmado",
    text: "Seu horário está confirmado. Chegue com alguns minutos de antecedência.",
    className: "border-emerald-500/40 bg-emerald-600/10 text-emerald-200",
  },
  concluido: {
    label: "Atendimento concluído",
    text: "Obrigado pela visita!",
    className: "border-border bg-surface text-foreground",
  },
  cancelado: {
    label: "Cancelado",
    text: "Este pedido foi cancelado ou não pôde ser confirmado. Você pode fazer um novo pedido.",
    className: "border-rose-500/40 bg-rose-600/10 text-rose-200",
  },
};

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

function whatsappHref(phone: string | null): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");

  if (digits.length < 10) {
    return null;
  }

  const number =
    digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;

  return `https://wa.me/${number}`;
}

export default async function PedidoPage({ params }: Readonly<PageProps>) {
  const { slug, token } = await params;
  const booking = await getPublicBooking(slug, token);

  if (!booking) {
    notFound();
  }

  const { company, appointment } = booking;
  const view = STATUS_VIEW[appointment.status];
  const now = new Date();
  const isOpen =
    appointment.status === "aguardando" || appointment.status === "agendado";
  const canCancel = isOpen && new Date(appointment.dataHora) > now;
  const shopWhatsapp = whatsappHref(company.telefone);

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 sm:py-10">
      <style>{getThemeCss(company.tema)}</style>

      {appointment.status === "aguardando" ? <AutoRefresh /> : null}

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
          <p className="text-sm text-muted-foreground">Acompanhar pedido</p>
        </div>
      </header>

      <div className="space-y-3">
        <section className={`rounded-xl border p-4 ${view.className}`}>
          <p className="text-base font-semibold">{view.label}</p>
          <p className="mt-1 text-sm opacity-90">{view.text}</p>
        </section>

        <section className="space-y-2 rounded-xl border border-border bg-surface p-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Serviço</p>
            <p className="font-medium text-foreground">
              {appointment.servicoNome}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Profissional</p>
            <p className="font-medium text-foreground">
              {appointment.profissionalNome}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Quando</p>
            <p className="font-medium capitalize text-foreground">
              {formatWhen(appointment.dataHora)}
            </p>
          </div>
          {appointment.codigo ? (
            <div>
              <p className="text-xs text-muted-foreground">
                Código de consulta
              </p>
              <p className="font-semibold tracking-widest text-foreground">
                {formatBookingCode(appointment.codigo)}
              </p>
            </div>
          ) : null}
        </section>

        {canCancel ? <CancelButton slug={company.slug} token={token} /> : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          {shopWhatsapp ? (
            <a
              href={shopWhatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-border bg-surface text-sm font-medium text-foreground transition hover:border-brand"
            >
              Falar com a barbearia
            </a>
          ) : null}
          <Link
            href={`/agendar/${company.slug}`}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-border bg-surface text-sm font-medium text-foreground transition hover:border-brand"
          >
            Fazer novo pedido
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          Este link é pessoal: não compartilhe. Guarde-o para acompanhar a
          resposta da barbearia.
        </p>
      </div>
    </main>
  );
}
