"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createQuickAppointmentAction } from "@/app/painel/agendamentos/actions";
import { CustomerCombobox, type ComboboxCustomer } from "@/components/painel/agendamentos/customer-combobox";
import { DEFAULT_PAYMENT_METHOD, PAYMENT_METHODS } from "@/lib/payment-methods";

type ActionState = {
  success: boolean;
  message: string;
};

type Option = {
  id: string;
  nome: string;
  valor?: number;
};

const INITIAL_STATE: ActionState = { success: false, message: "" };

const FIELD_CLASS =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-amber-400";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="h-11 w-full bg-amber-400 text-zinc-950 hover:bg-amber-300"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Salvando...
        </>
      ) : (
        "Registrar atendimento"
      )}
    </Button>
  );
}

export function QuickAppointmentDialog({
  employees,
  services,
  customers,
}: {
  employees: Option[];
  services: Option[];
  customers: ComboboxCustomer[];
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="h-11">
          <Zap className="mr-2 size-4" />
          Atendimento rapido
        </Button>
      </DialogTrigger>

      <DialogContent>
        <QuickAppointmentContent
          employees={employees}
          services={services}
          customers={customers}
          onClose={close}
        />
      </DialogContent>
    </Dialog>
  );
}

// Montado so enquanto o modal esta aberto: ao reabrir, estado e mensagens voltam limpos.
function QuickAppointmentContent({
  employees,
  services,
  customers,
  onClose,
}: {
  employees: Option[];
  services: Option[];
  customers: ComboboxCustomer[];
  onClose: () => void;
}) {
  const [serviceId, setServiceId] = useState("");
  const [valor, setValor] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<string>(DEFAULT_PAYMENT_METHOD);
  const [state, formAction] = useActionState<ActionState, FormData>(
    createQuickAppointmentAction,
    INITIAL_STATE,
  );

  useEffect(() => {
    if (!state.success) {
      return;
    }

    const timer = setTimeout(onClose, 1000);

    return () => clearTimeout(timer);
  }, [state.success, onClose]);

  function handleServiceChange(id: string) {
    setServiceId(id);
    const service = services.find((item) => item.id === id);
    setValor(service?.valor !== undefined ? String(service.valor) : "");
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Atendimento rapido</DialogTitle>
        <DialogDescription>
          Para cliente sem agendamento. Registra como concluido agora.
        </DialogDescription>
      </DialogHeader>

      {state.success ? (
        <div className="space-y-4">
          <p className="text-sm text-emerald-300">{state.message}</p>
          <Button type="button" className="h-11 w-full" onClick={onClose}>
            Fechar
            </Button>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="forma_pagamento" value={formaPagamento} />

            <div className="space-y-1">
              <label htmlFor="quick-service" className="text-sm text-zinc-200">
                Servico
              </label>
              <select
                id="quick-service"
                name="service_id"
                required
                value={serviceId}
                onChange={(event) => handleServiceChange(event.target.value)}
                className={FIELD_CLASS}
              >
                <option value="">Selecione</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="quick-employee" className="text-sm text-zinc-200">
                Funcionario
              </label>
              <select
                id="quick-employee"
                name="employee_id"
                required
                defaultValue={employees.length === 1 ? employees[0].id : ""}
                className={FIELD_CLASS}
              >
                <option value="">Selecione</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.nome}
                  </option>
                ))}
              </select>
            </div>

            <CustomerCombobox customers={customers} optional />

            <div className="space-y-1">
              <p className="text-sm text-zinc-200">Forma de pagamento</p>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setFormaPagamento(method.value)}
                    className={`h-11 rounded-lg border px-3 text-sm font-medium transition ${
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

            <div className="space-y-1">
              <label htmlFor="quick-valor" className="text-sm text-zinc-200">
                Valor (R$)
              </label>
              <input
                id="quick-valor"
                name="valor_final"
                type="number"
                min={0}
                step="0.01"
                required
                value={valor}
                onChange={(event) => setValor(event.target.value)}
                className={FIELD_CLASS}
              />
            </div>

            {state.message ? <p className="text-sm text-red-300">{state.message}</p> : null}

            <SubmitButton />
          </form>
        )}
    </>
  );
}
