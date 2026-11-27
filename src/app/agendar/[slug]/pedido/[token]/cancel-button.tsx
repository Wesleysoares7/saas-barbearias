"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { cancelPublicBookingAction } from "./actions";

type CancelState = {
  success: boolean;
  message: string;
};

const INITIAL_STATE: CancelState = { success: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-rose-500/50 text-sm font-semibold text-rose-200 transition hover:bg-rose-600/10 disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Cancelando...
        </>
      ) : (
        "Cancelar pedido"
      )}
    </button>
  );
}

export function CancelButton({
  slug,
  token,
}: Readonly<{ slug: string; token: string }>) {
  const [state, formAction] = useActionState<CancelState, FormData>(
    cancelPublicBookingAction,
    INITIAL_STATE,
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm("Cancelar este pedido? O horário será liberado.")) {
          event.preventDefault();
        }
      }}
      className="space-y-2"
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="token" value={token} />
      <SubmitButton />
      {state.message && !state.success ? (
        <p
          aria-live="polite"
          role="status"
          className="rounded-lg border border-amber-500/50 bg-amber-600/15 px-3 py-2 text-sm text-amber-200"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
