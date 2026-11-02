"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { deletePaymentAction, updatePaymentAction } from "@/app/painel/financeiro/actions";
import { formatDateTimeBR } from "@/lib/datetime";
import { getPaymentMethodLabel, isPaymentMethod, PAYMENT_METHODS } from "@/lib/payment-methods";

type PaymentItem = {
  id: string;
  appointmentId: string;
  clienteNome: string;
  dataHora: string;
  valor: number;
  formaPagamento: string;
  percentualComissao: number;
  valorComissao: number;
};

type ActionState = {
  success: boolean;
  message: string;
};

const INITIAL_STATE: ActionState = {
  success: false,
  message: "",
};

function UpdateButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="h-9 bg-amber-400 text-zinc-950 hover:bg-amber-300" disabled={pending}>
      {pending ? "Salvando..." : "Salvar"}
    </Button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" className="h-9 border-border text-zinc-100" disabled={pending}>
      {pending ? "Excluindo..." : "Excluir"}
    </Button>
  );
}

function formatDateTimeLabel(iso: string): string {
  const formatted = formatDateTimeBR(iso);

  return formatted === "-" ? iso : formatted;
}

export function PaymentItemForm({ payment }: { payment: PaymentItem }) {
  const [updateState, updateAction] = useActionState<ActionState, FormData>(updatePaymentAction, INITIAL_STATE);
  const [deleteState, deleteAction] = useActionState<ActionState, FormData>(deletePaymentAction, INITIAL_STATE);
  const [isEditing, setIsEditing] = useState(false);
  const isLegacyMethod = !isPaymentMethod(payment.formaPagamento);
  // Valor antigo fora da lista comeca sem selecao, forcando a escolha de uma opcao.
  const [formaPagamento, setFormaPagamento] = useState<string>(isLegacyMethod ? "" : payment.formaPagamento);
  const shouldShowEditForm = isEditing || (!updateState.success && Boolean(updateState.message));

  return (
    <article className="rounded-xl border border-border bg-surface-2 p-4">
      {updateState.message ? (
        <div className="sticky top-3 z-20 mb-3 flex justify-center" aria-live="polite">
          <div
            className={`w-full rounded-lg border px-4 py-3 text-sm font-medium ${
              updateState.success
                ? "border-emerald-500/50 bg-emerald-600/15 text-emerald-200"
                : "border-amber-500/50 bg-amber-600/15 text-amber-200"
            }`}
            style={updateState.success ? { animation: "payment-item-toast-fade 3.5s ease forwards" } : undefined}
          >
            {updateState.message}
          </div>
        </div>
      ) : null}

      {deleteState.message ? (
        <div className="sticky top-3 z-20 mb-3 flex justify-center" aria-live="polite">
          <div
            className={`w-full rounded-lg border px-4 py-3 text-sm font-medium ${
              deleteState.success
                ? "border-emerald-500/50 bg-emerald-600/15 text-emerald-200"
                : "border-amber-500/50 bg-amber-600/15 text-amber-200"
            }`}
            style={deleteState.success ? { animation: "payment-item-toast-fade 3.5s ease forwards" } : undefined}
          >
            {deleteState.message}
          </div>
        </div>
      ) : null}

      <div className="mb-3 rounded-lg border border-border bg-surface p-3 text-sm text-zinc-200">
        <p>
          <span className="text-zinc-400">Cliente:</span> {payment.clienteNome}
        </p>
        <p>
          <span className="text-zinc-400">Horario:</span> {formatDateTimeLabel(payment.dataHora)}
        </p>
      </div>

      {shouldShowEditForm ? (
        <form action={updateAction} onSubmit={() => setIsEditing(false)} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="id" value={payment.id} />

          <div className="space-y-1">
            <label htmlFor={`pagamento-valor-${payment.id}`} className="text-sm text-zinc-200">
              Valor (R$)
            </label>
            <input
              id={`pagamento-valor-${payment.id}`}
              name="valor"
              type="number"
              min={0}
              step="0.01"
              defaultValue={payment.valor}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor={`pagamento-comissao-${payment.id}`} className="text-sm text-zinc-200">
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
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
              required
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <p className="text-sm text-zinc-200">Forma de pagamento</p>
            <input type="hidden" name="forma_pagamento" value={formaPagamento} />
            {isLegacyMethod ? (
              <p className="text-xs text-zinc-400">
                Valor atual: {getPaymentMethodLabel(payment.formaPagamento)}. Escolha uma das opcoes abaixo.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setFormaPagamento(method.value)}
                  className={`h-9 rounded-lg border px-3 text-sm font-medium transition ${
                    formaPagamento === method.value
                      ? "border-amber-400 bg-amber-400/15 text-amber-200"
                      : "border-border bg-surface text-zinc-300 hover:border-border"
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-sm text-zinc-200">Comissao calculada atual</label>
            <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-zinc-100">
              R$ {payment.valorComissao.toFixed(2)}
            </p>
          </div>

          <div className="md:col-span-2 flex items-center justify-start gap-3">
            <UpdateButton />
            <Button type="button" variant="outline" className="h-9 border-border text-zinc-100" onClick={() => setIsEditing(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs text-zinc-400">Valor</p>
            <p className="text-sm text-zinc-100">R$ {payment.valor.toFixed(2)}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-zinc-400">Comissao (%)</p>
            <p className="text-sm text-zinc-100">{payment.percentualComissao.toFixed(2)}%</p>
          </div>

          <div className="space-y-1 md:col-span-2">
            <p className="text-xs text-zinc-400">Forma de pagamento</p>
            <p className="text-sm text-zinc-100">{getPaymentMethodLabel(payment.formaPagamento)}</p>
          </div>

          <div className="space-y-1 md:col-span-2">
            <p className="text-xs text-zinc-400">Comissao calculada atual</p>
            <p className="text-sm text-zinc-100">R$ {payment.valorComissao.toFixed(2)}</p>
          </div>

          <div className="md:col-span-2 flex items-center justify-start gap-3">
            <Button type="button" className="h-9 bg-amber-400 text-zinc-950 hover:bg-amber-300" onClick={() => setIsEditing(true)}>
              Editar
            </Button>
          </div>
        </div>
      )}

      <form action={deleteAction} className="mt-3 flex items-center justify-end gap-3">
        <input type="hidden" name="id" value={payment.id} />
        <DeleteButton />
      </form>

      <style jsx>{`
        @keyframes payment-item-toast-fade {
          0% {
            opacity: 1;
            transform: translateY(0);
          }
          80% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-8px);
          }
        }
      `}</style>
    </article>
  );
}
