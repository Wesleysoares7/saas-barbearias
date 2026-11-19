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
import { parseMoneyBR } from "@/lib/money";

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

function OpeningBalanceForm({
  entry,
  onClose,
}: {
  entry: { id: string; valor: number; valorPix: number; valorConta: number; data: string } | null;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(setOpeningBalanceAction, INITIAL_STATE);
  const [valorCaixa, setValorCaixa] = useState(
    entry ? String((entry.valor - entry.valorPix - entry.valorConta).toFixed(2)).replace(".", ",") : ""
  );
  const [valorPix, setValorPix] = useState(
    entry ? String(entry.valorPix.toFixed(2)).replace(".", ",") : ""
  );
  const [valorConta, setValorConta] = useState(
    entry ? String(entry.valorConta.toFixed(2)).replace(".", ",") : ""
  );

  const parsedCaixa = valorCaixa ? parseMoneyBR(valorCaixa) : 0;
  const parsedPix = valorPix ? parseMoneyBR(valorPix) : 0;
  const parsedConta = valorConta ? parseMoneyBR(valorConta) : 0;
  const totalCalculado = (parsedCaixa ?? 0) + (parsedPix ?? 0) + (parsedConta ?? 0);

  if (state.success && state.message) {
    onClose();
  }

  return (
    <form action={formAction} className="space-y-3">
      <CashMessage success={state.success} message={state.message} />

      <div className="space-y-1">
        <label htmlFor="opening-valor-caixa" className="text-sm text-foreground">
          Dinheiro em caixa (R$)
        </label>
        <input
          id="opening-valor-caixa"
          name="valor_caixa"
          type="text"
          inputMode="decimal"
          value={valorCaixa}
          onChange={(e) => setValorCaixa(e.target.value)}
          placeholder="0,00"
          className={CASH_FIELD_CLASS}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="opening-valor-pix" className="text-sm text-foreground">
          Saldo em Pix (R$)
        </label>
        <input
          id="opening-valor-pix"
          name="valor_pix"
          type="text"
          inputMode="decimal"
          value={valorPix}
          onChange={(e) => setValorPix(e.target.value)}
          placeholder="0,00"
          className={CASH_FIELD_CLASS}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="opening-valor-conta" className="text-sm text-foreground">
          Saldo em conta bancaria (R$)
        </label>
        <input
          id="opening-valor-conta"
          name="valor_conta"
          type="text"
          inputMode="decimal"
          value={valorConta}
          onChange={(e) => setValorConta(e.target.value)}
          placeholder="0,00"
          className={CASH_FIELD_CLASS}
        />
      </div>

      <div className="rounded-lg bg-muted p-3">
        <p className="text-xs text-muted-foreground">Saldo inicial total</p>
        <p className="text-lg font-semibold text-foreground">{formatCurrency(totalCalculado)}</p>
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
  );
}

export function OpeningBalanceCard({
  entry,
  movimentosAnteriores = 0,
}: {
  entry: { id: string; valor: number; valorPix: number; valorConta: number; data: string } | null;
  movimentosAnteriores?: number;
}) {
  const [open, setOpen] = useState(false);

  const hasEarlier = Boolean(entry) && movimentosAnteriores > 0;
  const hasPixOrConta = entry && (entry.valorPix > 0 || entry.valorConta > 0);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Landmark className="size-5 shrink-0 text-brand" />
          {entry ? (
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Saldo em {formatDateString(entry.data)} (inicio do controle)</p>
              <p className="truncate text-lg font-semibold text-foreground">{formatCurrency(entry.valor)}</p>
              {hasPixOrConta && (
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {entry.valor - entry.valorPix - entry.valorConta > 0 && (
                    <p>Caixa: {formatCurrency(entry.valor - entry.valorPix - entry.valorConta)}</p>
                  )}
                  {entry.valorPix > 0 && <p>Pix: {formatCurrency(entry.valorPix)}</p>}
                  {entry.valorConta > 0 && <p>Conta: {formatCurrency(entry.valorConta)}</p>}
                </div>
              )}
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

            <OpeningBalanceForm entry={entry} onClose={() => setOpen(false)} />
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