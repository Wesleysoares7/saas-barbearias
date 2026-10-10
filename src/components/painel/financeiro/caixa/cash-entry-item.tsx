"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Pencil, Trash2 } from "lucide-react";

import { deleteCashEntryAction, updateCashEntryAction } from "@/app/painel/financeiro/caixa-actions";
import { CashEntryFields, CashMessage } from "@/components/painel/financeiro/caixa/cash-fields";
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
  layout: "card" | "row";
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

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="outline"
      className="min-h-11 border-border text-rose-300"
      disabled={pending}
      aria-label="Excluir lancamento"
    >
      <Trash2 className="size-4" />
      <span className="sr-only sm:not-sr-only">{pending ? "Excluindo..." : "Excluir"}</span>
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
    <div className="flex items-center gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" className="min-h-11 border-border" aria-label="Editar lancamento">
            <Pencil className="size-4" />
            <span className="sr-only sm:not-sr-only">Editar</span>
          </Button>
        </DialogTrigger>

        <DialogContent>
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

      <form
        action={deleteAction}
        onSubmit={(event) => {
          if (!window.confirm("Excluir este lancamento?")) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={entry.id} />
        <DeleteButton />
      </form>

      {deleteState.message && !deleteState.success ? (
        <span className="text-xs text-amber-200" aria-live="polite">
          {deleteState.message}
        </span>
      ) : null}
    </div>
  );
}

export function CashEntryItem({ entry, layout }: CashEntryItemProps) {
  const isEntrada = entry.tipo === "entrada";
  const valorClass = isEntrada ? "text-emerald-300" : "text-rose-300";
  const valorText = `${isEntrada ? "+" : "-"} ${formatCurrency(entry.valor)}`;
  const pill = <StatusPill tone={isEntrada ? "success" : "danger"}>{isEntrada ? "Entrada" : "Despesa"}</StatusPill>;

  if (layout === "row") {
    return (
      <tr className="border-t border-border align-middle">
        <td className="px-3 py-2 text-sm text-muted-foreground">{formatDateBR(entry.data)}</td>
        <td className="px-3 py-2">{pill}</td>
        <td className="px-3 py-2 text-sm text-muted-foreground">{entry.categoria ?? "-"}</td>
        <td className="max-w-xs truncate px-3 py-2 text-sm text-foreground">{entry.descricao ?? "-"}</td>
        <td className={`px-3 py-2 text-right text-sm font-medium whitespace-nowrap ${valorClass}`}>{valorText}</td>
        <td className="px-3 py-2">
          <EntryActions entry={entry} />
        </td>
      </tr>
    );
  }

  return (
    <article className="space-y-2 rounded-xl border border-border bg-surface-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {pill}
          <span className="text-xs text-muted-foreground">{formatDateBR(entry.data)}</span>
        </div>
        <span className={`text-sm font-semibold whitespace-nowrap ${valorClass}`}>{valorText}</span>
      </div>
      <p className="truncate text-sm text-foreground">
        {entry.descricao ?? "-"}
        {entry.categoria ? <span className="text-muted-foreground"> · {entry.categoria}</span> : null}
      </p>
      <EntryActions entry={entry} />
    </article>
  );
}