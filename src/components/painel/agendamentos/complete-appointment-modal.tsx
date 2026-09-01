"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { completeAppointmentAndRegisterPaymentAction } from "@/app/painel/agendamentos/actions";

type ActionState = {
  success: boolean;
  message: string;
};

const INITIAL_STATE: ActionState = {
  success: false,
  message: "",
};

const PAYMENT_METHODS = [
  { value: "pix", label: "Pix" },
  { value: "cartao_credito", label: "Cartao credito" },
  { value: "cartao_debito", label: "Cartao debito" },
  { value: "dinheiro", label: "Dinheiro" },
];

function ConfirmButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="h-11 bg-amber-400 text-zinc-950 hover:bg-amber-300"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Finalizando...
        </>
      ) : (
        "Finalizar atendimento"
      )}
    </Button>
  );
}

export function CompleteAppointmentModal({
  appointmentId,
  clienteNome,
  servicoNome,
  valorSugerido,
  onCompleted,
}: {
  appointmentId: string;
  clienteNome: string;
  servicoNome: string;
  valorSugerido: number;
  onCompleted?: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [handledMessage, setHandledMessage] = useState<string | null>(null);
  const [state, formAction] = useActionState<ActionState, FormData>(
    completeAppointmentAndRegisterPaymentAction,
    INITIAL_STATE,
  );

  // Ajusta o estado durante a renderizacao (em vez de useEffect) para evitar
  // cascata de re-render sincrona; ver https://react.dev/learn/you-might-not-need-an-effect
  if (state.success && state.message !== handledMessage) {
    setHandledMessage(state.message);
    setOpen(false);
    onCompleted?.(state.message);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          className="h-9 bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
        >
          <CheckCircle2 className="size-4" />
          Concluir &amp; Cobrar
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Concluir atendimento e registrar pagamento</DialogTitle>
          <DialogDescription>
            Confirme os dados para finalizar em uma unica etapa.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-zinc-700/70 bg-zinc-950/60 p-3 text-sm text-zinc-200">
          <p>
            <span className="text-zinc-400">Cliente:</span> {clienteNome}
          </p>
          <p>
            <span className="text-zinc-400">Servico:</span> {servicoNome}
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="appointment_id" value={appointmentId} />
          <input type="hidden" name="forma_pagamento" value={formaPagamento} />

          <div className="space-y-1">
            <label
              htmlFor={`valor-final-${appointmentId}`}
              className="text-sm text-zinc-200"
            >
              Valor total (R$)
            </label>
            <input
              id={`valor-final-${appointmentId}`}
              name="valor_final"
              type="number"
              min={0}
              step="0.01"
              defaultValue={valorSugerido}
              className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
            />
          </div>

          <div className="space-y-1">
            <p className="text-sm text-zinc-200">Forma de pagamento</p>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setFormaPagamento(method.value)}
                  className={`h-9 rounded-lg border px-3 text-sm font-medium transition ${
                    formaPagamento === method.value
                      ? "border-amber-400 bg-amber-400/15 text-amber-200"
                      : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500"
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label
              htmlFor={`observacoes-${appointmentId}`}
              className="text-sm text-zinc-200"
            >
              Observacoes (opcional)
            </label>
            <textarea
              id={`observacoes-${appointmentId}`}
              name="observacoes"
              rows={2}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400"
              placeholder="Detalhes adicionais do atendimento"
            />
          </div>

          {!state.success && state.message ? (
            <p className="text-sm text-amber-300">{state.message}</p>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <ConfirmButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
