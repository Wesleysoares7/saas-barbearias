"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Landmark } from "lucide-react";

import { setOpeningBalanceAction } from "@/app/painel/financeiro/caixa-actions";
import { CASH_FIELD_CLASS, CashMessage } from "@/components/painel/financeiro/caixa/cash-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { todayInputValue } from "@/lib/datetime";

type ActionState = {
  success: boolean;
  message: string;
};

const INITIAL_STATE: ActionState = { success: false, message: "" };

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDateString(value: string): string {
  const [year, month, day] = value.split("-");

  return `${day}/${month}/${year}`;
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="h-11 bg-brand text-brand-foreground hover:bg-brand/90" disabled={pending}>
      {pending ? "Salvando..." : "Salvar saldo inicial"}
    </Button>
  );
}

export function OpeningBalanceCard({
  entry,
  movimentosAnteriores = 0,
}: {
  entry: { id: string; valor: number; data: string } | null;
  movimentosAnteriores?: number;
}) {
  const [open, setOpen] = useState(false);
  const [handledMessage, setHandledMessage] = useState<string | null>(null);
  const [state, formAction] = useActionState<ActionState, FormData>(setOpeningBalanceAction, INITIAL_STATE);

  if (state.success && state.message !== handledMessage) {
    setHandledMessage(state.message);
    setOpen(false);
  }

  const hasEarlier = Boolean(entry) && movimentosAnteriores > 0;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Landmark className="size-5 shrink-0 text-brand" />
        {entry ? (
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Saldo em {formatDateString(entry.data)} (inicio do controle)</p>
            <p className="truncate text-lg font-semibold text-foreground">{formatCurrency(entry.valor)}</p>
          </div>
        ) : (
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Definir saldo inicial</p>
            <p className="text-xs text-muted-foreground">Informe quanto voce tem em caixa para iniciar o controle.</p>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" className="min-h-11 border-border">
            {entry ? "Editar" : "Definir"}
          </Button>
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Saldo inicial</DialogTitle>
            <DialogDescription>
              Informe quanto voce tinha em caixa no INICIO da data de inicio do controle. O app conta os movimentos a partir dela.
            </DialogDescription>
          </DialogHeader>

          <form action={formAction} className="space-y-3">
            <CashMessage success={state.success} message={state.message} />

            <div className="space-y-1">
              <label htmlFor="opening-valor" className="text-sm text-foreground">
                Valor em caixa nesta data (R$)
              </label>
              <input
                id="opening-valor"
                name="valor"
                type="text"
                inputMode="decimal"
                defaultValue={entry ? String(entry.valor).replace(".", ",") : ""}
                placeholder="0,00"
                className={CASH_FIELD_CLASS}
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="opening-data" className="text-sm text-foreground">
                Inicio do controle
              </label>
              <input
                id="opening-data"
                name="data"
                type="date"
                defaultValue={entry?.data ?? todayInputValue()}
                className={CASH_FIELD_CLASS}
                required
              />
              <p className="text-xs text-muted-foreground">
                O app conta os movimentos a partir desta data. O que aconteceu antes dela ja esta dentro do valor informado.
              </p>
            </div>

            <SubmitButton />
          </form>
        </DialogContent>
      </Dialog>
    </div>

      {hasEarlier && entry ? (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-600/10 p-3 text-xs text-amber-200 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {movimentosAnteriores === 1
              ? `1 movimento anterior a ${formatDateString(entry.data)} nao entra no saldo, pois o valor informado ja o considera. Para inclui-lo, use uma data anterior.`
              : `${movimentosAnteriores} movimentos anteriores a ${formatDateString(entry.data)} nao entram no saldo, pois o valor informado ja os considera. Para inclui-los, use uma data anterior.`}
          </p>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 shrink-0 border-amber-500/40 text-xs text-amber-200"
            onClick={() => setOpen(true)}
          >
            Alterar data
          </Button>
        </div>
      ) : null}
    </div>
  );
}