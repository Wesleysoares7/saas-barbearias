"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";

import { createCashEntryAction } from "@/app/painel/financeiro/caixa-actions";
import { CashEntryFields, CashMessage } from "@/components/painel/financeiro/caixa/cash-fields";
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

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="h-11 bg-brand text-brand-foreground hover:bg-brand/90" disabled={pending}>
      {pending ? "Salvando..." : "Salvar lancamento"}
    </Button>
  );
}

export function CashEntryDialog() {
  const [open, setOpen] = useState(false);
  const [handledMessage, setHandledMessage] = useState<string | null>(null);
  const [state, formAction] = useActionState<ActionState, FormData>(createCashEntryAction, INITIAL_STATE);

  if (state.success && state.message !== handledMessage) {
    setHandledMessage(state.message);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" className="min-h-11 bg-brand text-brand-foreground hover:bg-brand/90">
          <Plus className="size-4" />
          Novo lancamento
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo lancamento</DialogTitle>
          <DialogDescription>Registre uma entrada ou despesa avulsa no caixa.</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-3">
          <CashMessage success={state.success} message={state.message} />

          <div className="space-y-1">
            <label htmlFor="cash-new-tipo" className="text-sm text-foreground">
              Tipo
            </label>
            <select
              id="cash-new-tipo"
              name="tipo"
              defaultValue="despesa"
              className="h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-base text-foreground outline-none focus:border-brand"
            >
              <option value="entrada">Entrada</option>
              <option value="despesa">Despesa</option>
            </select>
          </div>

          <CashEntryFields
            idPrefix="cash-new"
            defaults={{ valor: "", data: todayInputValue(), categoria: "", descricao: "" }}
          />

          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}