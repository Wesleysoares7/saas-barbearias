"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { ChevronDown, Loader2 } from "lucide-react";

import { saveBookingToken } from "@/lib/agendamento-publico/my-bookings-storage";

import { lookupBookingAction } from "./lookup-actions";

type LookupState = {
  status: "idle" | "error" | "found";
  message: string;
  token?: string;
  path?: string;
};

const INITIAL_STATE: LookupState = { status: "idle", message: "" };

const FIELD_CLASS =
  "h-12 w-full rounded-lg border border-border bg-surface px-3 text-base";

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
          Consultando...
        </>
      ) : (
        "Consultar pedido"
      )}
    </button>
  );
}

export function LookupBooking({ slug }: Readonly<{ slug: string }>) {
  const router = useRouter();
  const [state, formAction] = useActionState<LookupState, FormData>(
    lookupBookingAction,
    INITIAL_STATE,
  );

  useEffect(() => {
    if (state.status === "found" && state.path) {
      if (state.token) {
        // Este aparelho passa a lembrar do pedido.
        saveBookingToken(slug, state.token);
      }

      router.push(state.path);
    }
  }, [state, slug, router]);

  return (
    <details className="group mb-4 rounded-xl border border-border bg-surface">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
        Já fez um pedido? Consulte pelo código
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>

      <form
        action={formAction}
        className="space-y-3 border-t border-border p-4"
      >
        <input type="hidden" name="slug" value={slug} />

        <div className="space-y-1.5">
          <label
            htmlFor="codigo"
            className="text-sm font-medium text-foreground"
          >
            Código do pedido
          </label>
          <input
            id="codigo"
            name="codigo"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={8}
            required
            placeholder="K7M-4QP"
            className={`${FIELD_CLASS} uppercase`}
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="lookup-telefone"
            className="text-sm font-medium text-foreground"
          >
            Telefone usado no pedido
          </label>
          <input
            id="lookup-telefone"
            name="telefone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            placeholder="(86) 99999-9999"
            className={FIELD_CLASS}
          />
        </div>

        {state.message ? (
          <p
            aria-live="polite"
            role="status"
            className="rounded-lg border border-amber-500/50 bg-amber-600/15 px-3 py-2 text-sm text-amber-200"
          >
            {state.message}
          </p>
        ) : null}

        <SubmitButton />

        <p className="text-xs text-muted-foreground">
          O código aparece depois que você envia o pedido e também vai na
          mensagem de confirmação da barbearia.
        </p>
      </form>
    </details>
  );
}
