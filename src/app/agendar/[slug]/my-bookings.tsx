"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  keepBookingTokens,
  readBookingTokens,
} from "@/lib/agendamento-publico/my-bookings-storage";

import { getMyBookingsAction, type MyBooking } from "./my-bookings-actions";

const STATUS: Record<
  MyBooking["status"],
  { label: string; className: string }
> = {
  aguardando: {
    label: "Aguardando",
    className: "border-amber-500/40 bg-amber-600/10 text-amber-200",
  },
  agendado: {
    label: "Confirmado",
    className: "border-emerald-500/40 bg-emerald-600/10 text-emerald-200",
  },
  concluido: {
    label: "Concluído",
    className: "border-border bg-surface text-foreground",
  },
  cancelado: {
    label: "Cancelado",
    className: "border-rose-500/40 bg-rose-600/10 text-rose-200",
  },
};

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

export function MyBookings({ slug }: { slug: string }) {
  const [items, setItems] = useState<MyBooking[]>([]);

  useEffect(() => {
    const tokens = readBookingTokens(slug);

    if (tokens.length === 0) {
      return;
    }

    let active = true;

    getMyBookingsAction(slug, tokens)
      .then((result) => {
        if (!active || result === null) {
          return;
        }

        setItems(result);
        // Mantem so os pedidos ainda validos (remove os antigos).
        keepBookingTokens(
          slug,
          result.map((item) => item.token),
        );
      })
      .catch(() => {
        // Sem rede ou erro do servidor: nao mostra nada e mantem os codigos salvos.
      });

    return () => {
      active = false;
    };
  }, [slug]);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mb-4 rounded-xl border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-foreground">Seus pedidos</h2>

      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <Link
            key={item.token}
            href={`/agendar/${slug}/pedido/${item.token}`}
            className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 p-3 transition hover:border-brand"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">
                {item.servicoNome} · {item.profissionalNome}
              </span>
              <span className="block text-xs capitalize text-muted-foreground">
                {formatWhen(item.dataHora)}
              </span>
            </span>
            <span
              className={`shrink-0 rounded-full border px-2 py-1 text-xs font-medium ${
                STATUS[item.status].className
              }`}
            >
              {STATUS[item.status].label}
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Os pedidos ficam salvos neste aparelho.
      </p>
    </section>
  );
}
