"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";

import {
  AwaitingAppointmentItem,
  type AwaitingItem,
  type Notify,
  type Outcome,
} from "@/components/painel/agendamentos/awaiting-appointment-item";
import { formatDateTimeBR } from "@/lib/datetime";

type Resolved = {
  item: AwaitingItem;
  outcome: Outcome;
  notify?: Notify;
  dismissed: boolean;
};

function buildNotifyHref(entry: Resolved): string | null {
  const digits = (entry.item.clienteTelefone ?? "").replace(/\D/g, "");

  if (digits.length < 10) {
    return null;
  }

  const number =
    digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
  const origin = window.location.origin;
  const when = formatDateTimeBR(entry.item.dataHora);
  const shop = entry.notify?.companyName || "nossa barbearia";
  const slug = entry.notify?.slug;
  const token = entry.notify?.token;

  let text: string;

  if (entry.outcome === "confirmado") {
    text = `Olá, ${entry.item.clienteNome}! Seu agendamento em ${shop} está confirmado: ${
      entry.item.servicoNome ?? "serviço"
    } em ${when}.`;

    if (slug && token) {
      text += ` Acompanhe ou cancele por aqui: ${origin}/agendar/${slug}/pedido/${token}`;
    }
  } else {
    text = `Olá, ${entry.item.clienteNome}! Infelizmente não conseguimos atender seu pedido de ${when} em ${shop}.`;

    if (slug) {
      text += ` Você pode escolher outro horário aqui: ${origin}/agendar/${slug}`;
    }
  }

  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export function AwaitingList({
  items,
  canUpdate,
}: {
  items: AwaitingItem[];
  canUpdate: boolean;
}) {
  const [resolved, setResolved] = useState<Record<string, Resolved>>({});

  const pending = items.filter((item) => !resolved[item.id]);
  const done = Object.values(resolved).filter((entry) => !entry.dismissed);

  if (pending.length === 0 && done.length === 0) {
    return null;
  }

  function markResolved(item: AwaitingItem, outcome: Outcome, notify?: Notify) {
    setResolved((current) => ({
      ...current,
      [item.id]: { item, outcome, notify, dismissed: false },
    }));
  }

  function dismiss(id: string) {
    setResolved((current) => {
      const entry = current[id];

      return entry
        ? { ...current, [id]: { ...entry, dismissed: true } }
        : current;
    });
  }

  return (
    <section className="space-y-2">
      {done.map((entry) => {
        const href = buildNotifyHref(entry);
        const confirmed = entry.outcome === "confirmado";

        return (
          <div
            key={entry.item.id}
            className={`rounded-xl border p-3 sm:p-4 ${
              confirmed
                ? "border-emerald-500/40 bg-emerald-600/10"
                : "border-rose-500/40 bg-rose-600/10"
            }`}
          >
            <p
              className={`text-sm font-semibold ${
                confirmed ? "text-emerald-200" : "text-rose-200"
              }`}
            >
              {confirmed ? "Pedido confirmado" : "Pedido recusado"}
            </p>
            <p className="mt-1 text-sm text-foreground">
              {entry.item.clienteNome} · {formatDateTimeBR(entry.item.dataHora)}
            </p>
            <p className="text-xs text-muted-foreground">
              Avise o cliente para ele não ficar sem resposta.
            </p>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-foreground hover:bg-brand/90 sm:h-11 sm:w-auto"
                >
                  <MessageCircle className="size-4" />
                  Avisar no WhatsApp
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => dismiss(entry.item.id)}
                className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-medium text-foreground sm:h-11 sm:w-auto"
              >
                Fechar
              </button>
            </div>
          </div>
        );
      })}

      {pending.length > 0 ? (
        <>
          <h2 className="px-1 text-lg font-medium text-zinc-100">
            Aguardando confirmacao ({pending.length})
          </h2>
          <p className="px-1 text-xs text-muted-foreground">
            Pedidos feitos pelo cliente. O horario fica reservado ate voce
            responder.
          </p>
          {pending.map((item) => (
            <AwaitingAppointmentItem
              key={item.id}
              item={item}
              canUpdate={canUpdate}
              onResolved={(outcome, notify) =>
                markResolved(item, outcome, notify)
              }
            />
          ))}
        </>
      ) : null}
    </section>
  );
}
