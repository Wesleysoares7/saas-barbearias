"use client";

import { useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { aderirPlanoAction } from "@/app/painel/plano/actions";
import { Button } from "@/components/ui/button";
import { formatDocumento, onlyDigits } from "@/lib/documento";

type ActionState = {
  success: boolean;
  message: string;
};

type AdherePlanFormProps = Readonly<{
  documento: string | null;
}>;

const INITIAL_STATE: ActionState = { success: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="h-11 bg-brand text-brand-foreground hover:bg-brand/90"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Aderir a um plano
        </>
      ) : (
        "Aderir a um plano"
      )}
    </Button>
  );
}

export function AdherePlanForm({ documento }: AdherePlanFormProps) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    aderirPlanoAction,
    INITIAL_STATE,
  );

  const [documentoInput, setDocumentoInput] = useState(
    documento ? formatDocumento(documento) : "",
  );

  const handleDocumentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const digits = onlyDigits(value);

    if (digits.length <= 14) {
      setDocumentoInput(formatDocumento(digits));
    }
  };

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label htmlFor="documento" className="mb-2 block text-sm font-medium">
          CPF ou CNPJ <span className="text-rose-400">*</span>
        </label>
        <input
          type="text"
          id="documento"
          name="documento"
          required
          value={documentoInput}
          onChange={handleDocumentoChange}
          placeholder="000.000.000-00"
          className="h-11 w-full rounded-lg border border-muted-foreground/30 bg-muted/40 px-3 py-2 text-sm placeholder-muted-foreground/50 transition-colors hover:border-muted-foreground/50 focus:border-brand focus:bg-transparent focus:outline-none"
        />
      </div>

      {state.message ? (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            state.success
              ? "bg-emerald-400/15 text-emerald-300"
              : "bg-rose-400/15 text-rose-300"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <SubmitButton />
    </form>
  );
}
