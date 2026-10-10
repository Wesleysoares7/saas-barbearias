"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { History } from "lucide-react";

import { deleteCustomerAction, updateCustomerAction } from "@/app/painel/clientes/actions";
import { ConfirmDelete } from "@/components/painel/ui/confirm-delete";
import { EditDialog, FIELD_CLASS, useEditDialogState } from "@/components/painel/ui/edit-dialog";
import { getInitials, ListRow, ROW_ICON_BUTTON_CLASS } from "@/components/painel/ui/list-row";
import { StatusPill } from "@/components/painel/ui/status-pill";
import { Button } from "@/components/ui/button";

type CustomerItem = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  observacoes: string | null;
  ativo: boolean;
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
    <Button type="submit" className="min-h-11 bg-brand text-brand-foreground hover:bg-brand/90" disabled={pending}>
      {pending ? "Salvando..." : "Salvar"}
    </Button>
  );
}

export function CustomerItemForm({ customer }: { customer: CustomerItem }) {
  const { open, setOpen, message, setMessage } = useEditDialogState();
  const [, updateAction] = useActionState<ActionState, FormData>(async (previous, formData) => {
    const result = await updateCustomerAction(previous, formData);

    setMessage(result.success ? "" : result.message);

    if (result.success) {
      setOpen(false);
    }

    return result;
  }, INITIAL_STATE);
  const [deleteState, deleteAction] = useActionState<ActionState, FormData>(deleteCustomerAction, INITIAL_STATE);

  return (
    <ListRow
      leading={getInitials(customer.nome)}
      title={customer.nome}
      subtitle={customer.telefone?.trim() || "Sem telefone"}
      columns={[{ label: "E-mail", value: customer.email?.trim() || "-" }]}
      status={<StatusPill tone={customer.ativo ? "success" : "neutral"}>{customer.ativo ? "Ativo" : "Inativo"}</StatusPill>}
      actions={
        <>
          <Link
            href={`/painel/clientes/${customer.id}`}
            className={ROW_ICON_BUTTON_CLASS}
            aria-label={`Ver historico de ${customer.nome}`}
            title="Ver historico"
          >
            <History className="size-4" />
          </Link>
          <EditDialog
            title="Editar cliente"
            label={`Editar ${customer.nome}`}
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (next) setMessage("");
            }}
          >
            <form action={updateAction} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="id" value={customer.id} />

              <div className="space-y-1 md:col-span-2">
                <label htmlFor={`cliente-nome-${customer.id}`} className="text-sm text-foreground">
                  Nome
                </label>
                <input id={`cliente-nome-${customer.id}`} name="nome" type="text" defaultValue={customer.nome} className={FIELD_CLASS} required />
              </div>

              <div className="space-y-1">
                <label htmlFor={`cliente-telefone-${customer.id}`} className="text-sm text-foreground">
                  Telefone
                </label>
                <input id={`cliente-telefone-${customer.id}`} name="telefone" type="text" defaultValue={customer.telefone ?? ""} className={FIELD_CLASS} />
              </div>

              <div className="space-y-1">
                <label htmlFor={`cliente-email-${customer.id}`} className="text-sm text-foreground">
                  E-mail
                </label>
                <input id={`cliente-email-${customer.id}`} name="email" type="email" defaultValue={customer.email ?? ""} className={FIELD_CLASS} />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label htmlFor={`cliente-observacoes-${customer.id}`} className="text-sm text-foreground">
                  Observacoes
                </label>
                <textarea
                  id={`cliente-observacoes-${customer.id}`}
                  name="observacoes"
                  rows={3}
                  defaultValue={customer.observacoes ?? ""}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-base text-foreground outline-none focus:border-brand"
                />
              </div>

              <label className="flex min-h-11 items-center gap-2 text-sm text-foreground md:col-span-2">
                <input name="ativo" type="checkbox" defaultChecked={customer.ativo} className="h-4 w-4 accent-brand" />
                Cliente ativo
              </label>

              {message ? (
                <p className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 md:col-span-2" aria-live="polite">
                  {message}
                </p>
              ) : null}

              <div className="flex gap-3 md:col-span-2">
                <UpdateButton />
                <Button type="button" variant="outline" className="min-h-11 border-border" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </EditDialog>
          <ConfirmDelete title={customer.nome} action={deleteAction} message={deleteState.success ? "" : deleteState.message}>
            <input type="hidden" name="id" value={customer.id} />
          </ConfirmDelete>
        </>
      }
    />
  );
}
