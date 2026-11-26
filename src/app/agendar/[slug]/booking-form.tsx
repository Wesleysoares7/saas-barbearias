"use client";

import Link from "next/link";
import Script from "next/script";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2 } from "lucide-react";

import { createPublicBookingAction } from "./actions";

type BookingState = {
  status: "idle" | "success" | "error" | "conflict";
  message: string;
};

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: Record<string, unknown>,
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
  }
}

const INITIAL_STATE: BookingState = { status: "idle", message: "" };

const FIELD_CLASS =
  "h-12 w-full rounded-lg border border-border bg-surface px-3 text-base";

function TurnstileWidget({
  siteKey,
  resetSignal,
}: {
  siteKey: string;
  resetSignal: unknown;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ready || !containerRef.current || !window.turnstile) {
      return;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: "dark",
    });

    return () => {
      if (widgetIdRef.current) {
        window.turnstile?.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [ready, siteKey]);

  // O token vale uma vez so: apos cada resposta do servidor, gera outro.
  useEffect(() => {
    if (widgetIdRef.current) {
      window.turnstile?.reset(widgetIdRef.current);
    }
  }, [resetSignal]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
      <div ref={containerRef} className="min-h-[65px]" />
    </>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-foreground transition hover:bg-brand/90 disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Enviando...
        </>
      ) : (
        "Enviar pedido"
      )}
    </button>
  );
}

export function BookingForm({
  slug,
  companyName,
  serviceId,
  employeeId,
  date,
  time,
  summary,
  backHref,
  newHref,
  siteKey,
}: {
  slug: string;
  companyName: string;
  serviceId: string;
  employeeId: string;
  date: string;
  time: string;
  summary: string;
  backHref: string;
  newHref: string;
  siteKey: string;
}) {
  const [state, formAction] = useActionState<BookingState, FormData>(
    createPublicBookingAction,
    INITIAL_STATE,
  );

  if (state.status === "success") {
    return (
      <section className="rounded-xl border border-emerald-500/40 bg-emerald-600/10 p-4 text-sm">
        <p className="flex items-center gap-2 font-semibold text-emerald-200">
          <CheckCircle2 className="size-5" />
          Pedido enviado!
        </p>
        <p className="mt-2 text-muted-foreground">
          {companyName} vai confirmar o seu horário. Seu pedido só vale depois
          da confirmação, e a resposta virá pelo telefone informado.
        </p>
        <p className="mt-2 text-foreground">{summary}.</p>
        <Link
          href={newHref}
          className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-brand"
        >
          Fazer outro pedido
        </Link>
      </section>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border border-brand/40 bg-brand/10 p-4"
    >
      <div>
        <p className="text-sm font-semibold text-foreground">Seu pedido</p>
        <p className="mt-1 text-sm text-muted-foreground">{summary}.</p>
      </div>

      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="servico" value={serviceId} />
      <input type="hidden" name="profissional" value={employeeId} />
      <input type="hidden" name="data" value={date} />
      <input type="hidden" name="hora" value={time} />

      <div className="space-y-1.5">
        <label htmlFor="nome" className="text-sm font-medium text-foreground">
          Seu nome
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          autoComplete="name"
          required
          maxLength={80}
          className={FIELD_CLASS}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="telefone"
          className="text-sm font-medium text-foreground"
        >
          Telefone (WhatsApp)
        </label>
        <input
          id="telefone"
          name="telefone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          placeholder="(86) 99999-9999"
          className={FIELD_CLASS}
        />
      </div>

      <div
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor="website">Não preencha este campo</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <label className="flex items-start gap-3 text-sm text-muted-foreground">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-0.5 size-5 shrink-0 accent-brand"
        />
        <span>
          Concordo em enviar meu nome e telefone para {companyName}, para
          confirmar este agendamento. Saiba mais na{" "}
          <Link
            href="/privacidade#agendamento-online"
            target="_blank"
            className="font-medium text-brand underline"
          >
            Política de Privacidade
          </Link>
          .
        </span>
      </label>

      {siteKey ? (
        <TurnstileWidget siteKey={siteKey} resetSignal={state} />
      ) : null}

      {state.message ? (
        <p
          aria-live="polite"
          role="status"
          className="rounded-lg border border-amber-500/50 bg-amber-600/15 px-3 py-2 text-sm text-amber-200"
        >
          {state.message}
        </p>
      ) : null}

      {state.status === "conflict" ? (
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center text-sm font-medium text-brand"
        >
          Escolher outro horário
        </Link>
      ) : null}

      <SubmitButton />

      <p className="text-xs text-muted-foreground">
        A barbearia confirma o seu horário. O pedido só vale depois da
        confirmação.
      </p>
    </form>
  );
}
