"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Pencil } from "lucide-react";

import { deleteCashEntryAction, updateCashEntryAction } from "@/app/painel/financeiro/caixa-actions";
import { CashEntryFields, CashMessage } from "@/components/painel/financeiro/caixa/cash-fields";
import { ConfirmDelete } from "@/components/painel/ui/confirm-delete";
import { ListRow, ROW_ICON_BUTTON_CLASS } from "@/components/painel/ui/list-row";
import { StatusPill } from "@/components/painel/ui/status-pill";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDateBR } from "@/lib/datetime";

type ActionState = {
  success: boolean;
  message: string;
};

type CashEntryItemProps = {
  entry: {
    id: string;
    tipo: "entrada" | "despesa";
    valor: number;
    categoria: string | null;
    descricao: string | null;
    data: string;
  };
};

const INITIAL_STATE: ActionState = { success: false, message: "" };

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="h-11 bg-brand text-brand-foreground hover:bg-brand/90" disabled={pending}>
      {pending ? "Salvando..." : "Salvar alteracoes"}
    </Button>
  );
}

function EntryActions({ entry }: { entry: CashEntryItemProps["entry"] }) {
  const [open, setOpen] = useState(false);
  const [handledMessage, setHandledMessage] = useState<string | null>(null);
  const [state, formAction] = useActionState<ActionState, FormData>(updateCashEntryAction, INITIAL_STATE);
  const [deleteState, deleteAction] = useActionState<ActionState, FormData>(deleteCashEntryAction, INITIAL_STATE);

  if (state.success && state.message !== handledMessage) {
    setHandledMessage(state.message);
    setOpen(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button type="button" className={ROW_ICON_BUTTON_CLASS} aria-label="Editar lancamento" title="Editar">
            <Pencil className="size-4" />
          </button>
        </DialogTrigger>

        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar lancamento</DialogTitle>
            <DialogDescription>{entry.tipo === "entrada" ? "Entrada avulsa" : "Despesa avulsa"}</DialogDescription>
          </DialogHeader>

          <form action={formAction} className="space-y-3">
            <input type="hidden" name="id" value={entry.id} />
            <CashMessage success={state.success} message={state.message} />
            <CashEntryFields
              idPrefix={`cash-edit-${entry.id}`}
              defaults={{
                valor: String(entry.valor).replace(".", ","),
                data: entry.data,
                categoria: entry.categoria ?? "",
                descricao: entry.descricao ?? "",
              }}
            />
            <SaveButton />
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        title="lancamento"
        action={deleteAction}
        message={deleteState.message && !deleteState.success ? deleteState.message : undefined}
      >
        <input type="hidden" name="id" value={entry.id} />
      </ConfirmDelete>
    </>
  );
}

export function CashEntryItem({ entry }: CashEntryItemProps) {
  const isEntrada = entry.tipo === "entrada";
  const valorClass = isEntrada ? "text-emerald-300" : "text-rose-300";
  const valorText = `${isEntrada ? "+" : "-"} ${formatCurrency(entry.valor)}`;
  const shortDate = formatDateBR(entry.data).slice(0, 5);

  return (
    <ListRow
      title={entry.descricao ?? "-"}
      status={<span className={`text-sm font-semibold whitespace-nowrap tabular-nums ${valorClass}`}>{valorText}</span>}
      subtitle={
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">
            {shortDate}
            {entry.categoria ? ` - ${entry.categoria}` : ""}
          </span>
          <StatusPill tone={isEntrada ? "success" : "danger"}>{isEntrada ? "Entrada" : "Despesa"}</StatusPill>
        </span>
      }
      actions={<EntryActions entry={entry} />}
    />
  );
}
