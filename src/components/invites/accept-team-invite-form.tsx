"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { acceptTeamInviteAction } from "@/app/convites/[token]/actions";
import { Button } from "@/components/ui/button";

type ActionState = {
  success: boolean;
  message: string;
};

const INITIAL_STATE: ActionState = {
  success: false,
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="h-11 bg-amber-400 text-zinc-950 hover:bg-amber-300" disabled={pending}>
      {pending ? "Confirmando..." : "Aceitar convite"}
    </Button>
  );
}

export function AcceptTeamInviteForm({ token }: { token: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(acceptTeamInviteAction, INITIAL_STATE);

  return (
    <>
      {state.message ? (
        <div className="mb-4" aria-live="polite">
          <div
            className={`w-full rounded-lg border px-4 py-3 text-sm font-medium ${
              state.success
                ? "border-emerald-500/50 bg-emerald-600/15 text-emerald-200"
                : "border-amber-500/50 bg-amber-600/15 text-amber-200"
            }`}
          >
            {state.message}
          </div>
        </div>
      ) : null}

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="token" value={token} />
        <SubmitButton />
      </form>

      <div className="mt-4">
        <Link
          href="/painel"
          className="text-sm text-zinc-300 underline decoration-zinc-600 underline-offset-4 hover:text-amber-300"
        >
          Ir para o painel
        </Link>
      </div>
    </>
  );
}
