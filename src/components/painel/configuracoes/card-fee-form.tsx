"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, AlertCircle } from "lucide-react";

import { setCardFeeAction } from "@/app/painel/configuracoes/actions";
import { Button } from "@/components/ui/button";

type ActionState = {
  success: boolean;
  message: string;
};

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
          Salvando...
        </>
      ) : (
        "Salvar taxa"
      )}
    </Button>
  );
}

function convertCommaToPoint(value: string): string {
  return value.replace(",", ".");
}

export function CardFeeForm({
  currentFee,
}: {
  currentFee: number | null;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    setCardFeeAction,
    INITIAL_STATE,
  );

  const displayValue = currentFee !== null ? currentFee.toString() : "";

  return (
    <form action={formAction} className="space-y-4">
      {currentFee === null ? (
        <div className="rounded-lg border border-amber-500/50 bg-amber-600/15 p-3 flex gap-3">
          <AlertCircle className="size-5 text-amber-300 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-200">
              <strong>Taxa não informada:</strong> pagamentos no cartão de crédito ficam bloqueados até você informar (use 0 se não houver taxa).
            </p>
          </div>
        </div>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="taxa_cartao_credito" className="text-sm text-foreground">
          Percentual da taxa (%)
        </label>
        <input
          id="taxa_cartao_credito"
          name="taxa_cartao_credito"
          type="number"
          inputMode="decimal"
          min="0"
          max="100"
          step="0.01"
          defaultValue={displayValue}
          placeholder="0,00"
          className="w-full h-11 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none transition"
          required
          onChange={(e) => {
            e.currentTarget.value = convertCommaToPoint(e.currentTarget.value);
          }}
          onBlur={(e) => {
            e.currentTarget.value = convertCommaToPoint(e.currentTarget.value);
          }}
        />
        <p className="text-xs text-muted-foreground">
          Decimal com até 2 casas. Ex: 2,50 ou 2.50
        </p>
      </div>

      {state.message ? (
        <p
          aria-live="polite"
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
  );
}
