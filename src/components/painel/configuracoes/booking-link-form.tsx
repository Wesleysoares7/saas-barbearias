"use client";

import Link from "next/link";
import { useActionState, useState, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import { Check, Copy, Loader2, MessageCircle } from "lucide-react";

import { setBookingConfigAction } from "@/app/painel/configuracoes/actions";
import { Button } from "@/components/ui/button";

type ActionState = {
  success: boolean;
  message: string;
};

export type BookingSaved = {
  slug: string | null;
  enabled: boolean;
  intervalMin: number;
  leadMin: number;
  maxDays: number;
};

const INITIAL_STATE: ActionState = { success: false, message: "" };

const FIELD_CLASS =
  "h-12 w-full rounded-lg border border-border bg-surface px-3 text-base sm:h-11 sm:text-sm";

const INTERVAL_OPTIONS = [
  { value: 15, label: "15 minutos" },
  { value: 30, label: "30 minutos" },
  { value: 45, label: "45 minutos" },
  { value: 60, label: "1 hora" },
];

const LEAD_OPTIONS = [
  { value: 0, label: "Sem antecedência" },
  { value: 30, label: "30 minutos" },
  { value: 60, label: "1 hora" },
  { value: 120, label: "2 horas" },
  { value: 240, label: "4 horas" },
];

const DAYS_OPTIONS = [
  { value: 7, label: "7 dias" },
  { value: 15, label: "15 dias" },
  { value: 30, label: "30 dias" },
  { value: 60, label: "60 dias" },
];

const subscribe = () => () => {};
const getOrigin = () => window.location.origin;
const getServerOrigin = () => "";

function sanitizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 40);
}

function slugify(value: string): string {
  return sanitizeSlug(value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")).replace(
    /^-+|-+$/g,
    "",
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="h-12 w-full bg-brand text-brand-foreground hover:bg-brand/90 sm:h-11 sm:w-auto"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Salvando...
        </>
      ) : (
        "Salvar agendamento online"
      )}
    </Button>
  );
}

export function BookingLinkForm({
  companyName,
  hasWorkHours,
  saved,
}: {
  companyName: string;
  hasWorkHours: boolean;
  saved: BookingSaved;
}) {
  const [slug, setSlug] = useState(saved.slug ?? "");
  const [enabled, setEnabled] = useState(saved.enabled);
  const [intervalMin, setIntervalMin] = useState(saved.intervalMin);
  const [leadMin, setLeadMin] = useState(saved.leadMin);
  const [maxDays, setMaxDays] = useState(saved.maxDays);
  const [copied, setCopied] = useState(false);

  const [state, formAction] = useActionState<ActionState, FormData>(
    setBookingConfigAction,
    INITIAL_STATE,
  );

  const origin = useSyncExternalStore(subscribe, getOrigin, getServerOrigin);
  const suggestion = slugify(companyName);
  const link = saved.enabled && saved.slug ? `${origin}/agendar/${saved.slug}` : null;
  const whatsappHref = link
    ? `https://wa.me/?text=${encodeURIComponent(
        `Agende seu horário na ${companyName}: ${link}`,
      )}`
    : "#";

  async function copyLink() {
    if (!link) {
      return;
    }

    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-4">
      {!hasWorkHours ? (
        <p className="rounded-xl border border-amber-500/40 bg-amber-600/10 p-3 text-sm text-amber-200">
          Nenhum funcionário tem horário cadastrado, então o cliente não verá
          horários livres.{" "}
          <Link href="/painel/horarios" className="font-medium underline">
            Cadastrar horários
          </Link>
        </p>
      ) : null}

      <form action={formAction} className="space-y-4">
        <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 p-3">
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">
              Receber agendamentos online
            </span>
            <span className="block text-xs text-muted-foreground">
              Você confirma cada pedido antes de valer.
            </span>
          </span>
          <input
            type="checkbox"
            name="agendamento_online"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            className="size-6 shrink-0 accent-brand"
          />
        </label>

        <div className="space-y-1.5">
          <label htmlFor="slug" className="text-sm font-medium text-foreground">
            Endereço do link
          </label>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm text-muted-foreground">/agendar/</span>
            <input
              id="slug"
              name="slug"
              type="text"
              value={slug}
              onChange={(event) => setSlug(sanitizeSlug(event.target.value))}
              placeholder="minha-barbearia"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={40}
              className={FIELD_CLASS}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            De 3 a 40 caracteres: letras minúsculas, números e hífens.
          </p>
          {slug === "" && suggestion.length >= 3 ? (
            <button
              type="button"
              onClick={() => setSlug(suggestion)}
              className="min-h-11 text-sm font-medium text-brand"
            >
              {`Usar sugestão: ${suggestion}`}
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label
              htmlFor="agendamento_intervalo_min"
              className="text-sm font-medium text-foreground"
            >
              Intervalo entre horários
            </label>
            <select
              id="agendamento_intervalo_min"
              name="agendamento_intervalo_min"
              value={intervalMin}
              onChange={(event) => setIntervalMin(Number(event.target.value))}
              className={FIELD_CLASS}
            >
              {INTERVAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="agendamento_antecedencia_min"
              className="text-sm font-medium text-foreground"
            >
              Antecedência mínima
            </label>
            <select
              id="agendamento_antecedencia_min"
              name="agendamento_antecedencia_min"
              value={leadMin}
              onChange={(event) => setLeadMin(Number(event.target.value))}
              className={FIELD_CLASS}
            >
              {LEAD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="agendamento_dias_max"
              className="text-sm font-medium text-foreground"
            >
              Agenda aberta até
            </label>
            <select
              id="agendamento_dias_max"
              name="agendamento_dias_max"
              value={maxDays}
              onChange={(event) => setMaxDays(Number(event.target.value))}
              className={FIELD_CLASS}
            >
              {DAYS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {state.message ? (
          <p
            aria-live="polite"
            role="status"
            className={`rounded-lg border px-3 py-2 text-sm ${
              state.success
                ? "border-emerald-500/50 bg-emerald-600/15 text-emerald-200"
                : "border-amber-500/50 bg-amber-600/15 text-amber-200"
            }`}
          >
            {state.message}
          </p>
        ) : null}

        <SubmitButton />
      </form>

      {link ? (
        <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-3">
          <p className="text-xs text-muted-foreground">Link para enviar ao cliente</p>
          <p className="text-sm font-medium break-all text-foreground">{link}</p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={copyLink}
              className="h-12 w-full sm:h-11 sm:w-auto"
            >
              {copied ? (
                <>
                  <Check className="size-4" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  Copiar link
                </>
              )}
            </Button>

            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-brand/45 bg-surface-2 px-3 text-sm font-semibold text-brand hover:border-brand sm:h-11 sm:w-auto"
            >
              <MessageCircle className="size-4" />
              Enviar no WhatsApp
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
