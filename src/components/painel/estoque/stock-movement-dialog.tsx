"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

import { registerStockMovementAction } from "@/app/painel/estoque/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ALLOWED_REASONS, REASON_LABELS, type StockMovementReason, type StockMovementType } from "@/types/stock";
import { todayInputValue } from "@/lib/datetime";

type ActionState = {
  success: boolean;
  message: string;
};

const INITIAL_STATE: ActionState = {
  success: false,
  message: "",
};

const FIELD_CLASS =
  "h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-base text-foreground outline-none focus:border-brand";

function ConfirmButton({ tipo }: { tipo: StockMovementType }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="h-11 bg-brand text-brand-foreground hover:bg-brand/90" disabled={pending}>
      {pending ? "Registrando..." : tipo === "entrada" ? "Registrar entrada" : "Registrar saida"}
    </Button>
  );
}

export function StockMovementDialog({
  productId,
  productName,
  unidade,
  tipo,
}: {
  productId: string;
  productName: string;
  unidade: string;
  tipo: StockMovementType;
}) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState<StockMovementReason>(ALLOWED_REASONS[tipo][0]);
  const [handledMessage, setHandledMessage] = useState<string | null>(null);
  const [state, formAction] = useActionState<ActionState, FormData>(registerStockMovementAction, INITIAL_STATE);

  if (state.success && state.message !== handledMessage) {
    setHandledMessage(state.message);
    setOpen(false);
  }

  const isEntrada = tipo === "entrada";
  const Icon = isEntrada ? ArrowDownToLine : ArrowUpFromLine;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={`min-h-11 flex-1 border-border sm:flex-none ${isEntrada ? "text-emerald-300" : "text-rose-300"}`}
        >
          <Icon className="size-4" />
          {isEntrada ? "Entrada" : "Saida"}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEntrada ? "Registrar entrada" : "Registrar saida"}</DialogTitle>
          <DialogDescription>
            {productName} ({unidade})
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-3">
          <input type="hidden" name="product_id" value={productId} />
          <input type="hidden" name="tipo" value={tipo} />

          {state.message && !state.success ? (
            <p className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200" aria-live="polite">
              {state.message}
            </p>
          ) : null}

          <div className="space-y-1">
            <label htmlFor={`mov-motivo-${productId}-${tipo}`} className="text-sm text-foreground">
              Motivo
            </label>
            <select
              id={`mov-motivo-${productId}-${tipo}`}
              name="motivo"
              value={motivo}
              onChange={(event) => setMotivo(event.target.value as StockMovementReason)}
              className={FIELD_CLASS}
            >
              {ALLOWED_REASONS[tipo].map((reason) => (
                <option key={reason} value={reason}>
                  {REASON_LABELS[reason]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor={`mov-qtd-${productId}-${tipo}`} className="text-sm text-foreground">
                Quantidade ({unidade})
              </label>
              <input
                id={`mov-qtd-${productId}-${tipo}`}
                name="quantidade"
                type="number"
                min={0.001}
                step="0.001"
                inputMode="decimal"
                className={FIELD_CLASS}
                required
              />
            </div>

            {isEntrada ? (
              <div className="space-y-1">
                <label htmlFor={`mov-custo-${productId}-${tipo}`} className="text-sm text-foreground">
                  Custo unitario (R$){motivo === "compra" ? "" : " - opcional"}
                </label>
                <input
                  id={`mov-custo-${productId}-${tipo}`}
                  name="custo_unitario"
                  type="number"
                  min={0}
                  step="0.0001"
                  inputMode="decimal"
                  className={FIELD_CLASS}
                  required={motivo === "compra"}
                />
              </div>
            ) : null}
          </div>

          {isEntrada ? (
            <p className="text-xs text-muted-foreground">
              Estoque que voce ja tinha antes de usar o app? Use o motivo Ajuste: nao conta como gasto no Financeiro.
            </p>
          ) : null}

          <div className="space-y-1">
            <label htmlFor={`mov-data-${productId}-${tipo}`} className="text-sm text-foreground">
              Data
            </label>
            <input
              id={`mov-data-${productId}-${tipo}`}
              name="data_movimento"
              type="date"
              defaultValue={todayInputValue()}
              className={FIELD_CLASS}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor={`mov-obs-${productId}-${tipo}`} className="text-sm text-foreground">
              Observacao
            </label>
            <textarea
              id={`mov-obs-${productId}-${tipo}`}
              name="observacao"
              rows={2}
              maxLength={500}
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-base text-foreground outline-none focus:border-brand"
            />
          </div>

          <ConfirmButton tipo={tipo} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
