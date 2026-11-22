"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  deletePaymentAction,
  updatePaymentAction,
} from "@/app/painel/financeiro/actions";
import { ConfirmDelete } from "@/components/painel/ui/confirm-delete";
import {
  EditDialog,
  FIELD_CLASS,
  useEditDialogState,
} from "@/components/painel/ui/edit-dialog";
import { getInitials, ListRow } from "@/components/painel/ui/list-row";
import { Button } from "@/components/ui/button";
import { formatDateTimeBR } from "@/lib/datetime";
import {
  getPaymentMethodLabel,
  isPaymentMethod,
  PAYMENT_METHODS,
} from "@/lib/payment-methods";

type PaymentItem = {
  id: string;
  appointmentId: string;
  clienteNome: string;
  dataHora: string;
  valor: number;
  formaPagamento: string;
  percentualComissao: number;
  valorComissao: number;
  taxaPercentual: number;
  valorTaxa: number;
};

type ActionState = {
  success: boolean;
  message: string;
};

const INITIAL_STATE: ActionState = {
  success: false,
  message: "",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function UpdateButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="min-h-11 bg-brand text-brand-foreground hover:bg-brand/90"
      disabled={pending}
    >
      {pending ? "Salvando..." : "Salvar"}
    </Button>
  );
}

function formatDateTimeLabel(iso: string): string {
  const formatted = formatDateTimeBR(iso);

  return formatted === "-" ? iso : formatted;
}

export function PaymentItemForm({ payment }: { payment: PaymentItem }) {
  const { open, setOpen, message, setMessage } = useEditDialogState();
  const [, updateAction] = useActionState<ActionState, FormData>(
    async (previous, formData) => {
      const result = await updatePaymentAction(previous, formData);

      setMessage(result.success ? "" : result.message);

      if (result.success) {
        setOpen(false);
      }

      return result;
    },
    INITIAL_STATE
  );
  const [deleteState, deleteAction] = useActionState<ActionState, FormData>(
    deletePaymentAction,
    INITIAL_STATE
  );

  const isLegacyMethod = !isPaymentMethod(payment.formaPagamento);
  // Valor antigo fora da lista comeca sem selecao, forcando a escolha de uma opcao.
  const [formaPagamento, setFormaPagamento] = useState<string>(
    isLegacyMethod ? "" : payment.formaPagamento
  );

  const metodoLabel = getPaymentMethodLabel(payment.formaPagamento);
  const comissaoLabel = `${currencyFormatter.format(
    payment.valorComissao
  )} (${payment.percentualComissao.toFixed(2)}%)`;

  const columns: Array<{ label: string; value: string }> = [
    { label: "Forma de pagamento", value: metodoLabel },
  ];

  if (payment.taxaPercentual > 0 && (payment.formaPagamento === "cartao_credito" || payment.formaPagamento === "cartao_debito")) {
    const liquido = payment.valor - payment.valorTaxa;
    columns.push({
      label: "Taxa do cartão",
      value: `${payment.taxaPercentual.toFixed(2)}% (${currencyFormatter.format(payment.valorTaxa)}) · Líquido: ${currencyFormatter.format(liquido)}`,
    });
  }

  columns.push({
    label: "Comissao",
    value: comissaoLabel,
  });

  return (
    <ListRow
      leading={getInitials(payment.clienteNome)}
      title={payment.clienteNome}
      subtitle={`${formatDateTimeLabel(payment.dataHora)} - ${metodoLabel}`}
      columns={columns}
      status={
        <span className="text-sm font-semibold whitespace-nowrap text-emerald-300 tabular-nums">
          {currencyFormatter.format(payment.valor)}
        </span>
      }
      actions={
        <>
          <EditDialog
            title="Editar pagamento"
            label={`Editar pagamento de ${payment.clienteNome}`}
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (next) setMessage("");
            }}
          >
            <form action={updateAction} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="id" value={payment.id} />

              <p className="text-sm text-muted-foreground md:col-span-2">
                {payment.clienteNome} - {formatDateTimeLabel(payment.dataHora)}
              </p>

              <div className="space-y-1">
                <label
                  htmlFor={`pagamento-valor-${payment.id}`}
                  className="text-sm text-foreground"
                >
                  Valor (R$)
                </label>
                <input
                  id={`pagamento-valor-${payment.id}`}
                  name="valor"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={payment.valor}
                  className={FIELD_CLASS}
                  required
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor={`pagamento-comissao-${payment.id}`}
                  className="text-sm text-foreground"
                >
                  Comissao (%)
                </label>
                <input
                  id={`pagamento-comissao-${payment.id}`}
                  name="percentual_comissao"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  defaultValue={payment.percentualComissao}
                  className={FIELD_CLASS}
                  required
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <p className="text-sm text-foreground">Forma de pagamento</p>
                <input
                  type="hidden"
                  name="forma_pagamento"
                  value={formaPagamento}
                />
                {isLegacyMethod ? (
                  <p className="text-xs text-muted-foreground">
                    Valor atual: {metodoLabel}. Escolha uma das opcoes abaixo.
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setFormaPagamento(method.value)}
                      className={`min-h-11 rounded-lg border px-3 text-sm font-medium transition ${
                        formaPagamento === method.value
                          ? "border-brand bg-brand/15 text-brand"
                          : "border-border bg-surface text-foreground hover:border-brand"
                      }`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-sm text-muted-foreground md:col-span-2">
                Comissao calculada atual:{" "}
                <span className="text-foreground">
                  {currencyFormatter.format(payment.valorComissao)}
                </span>
              </p>

              {message ? (
                <p
                  className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 md:col-span-2"
                  aria-live="polite"
                >
                  {message}
                </p>
              ) : null}

              <div className="flex gap-3 md:col-span-2">
                <UpdateButton />
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 border-border"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </EditDialog>

          <ConfirmDelete
            title={`pagamento de ${payment.clienteNome}`}
            action={deleteAction}
            message={deleteState.success ? "" : deleteState.message}
          >
            <input type="hidden" name="id" value={payment.id} />
          </ConfirmDelete>
        </>
      }
    />
  );
}
