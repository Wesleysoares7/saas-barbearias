"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { deleteServiceAction, updateServiceAction } from "@/app/painel/servicos/actions";
import { ConfirmDelete } from "@/components/painel/ui/confirm-delete";
import { EditDialog, FIELD_CLASS, useEditDialogState } from "@/components/painel/ui/edit-dialog";
import { ListRow } from "@/components/painel/ui/list-row";
import { StatusPill } from "@/components/painel/ui/status-pill";
import { Button } from "@/components/ui/button";

type ServiceItem = {
  id: string;
  nome: string;
  duracao: number;
  valor: number;
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

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function UpdateButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="min-h-11 bg-brand text-brand-foreground hover:bg-brand/90" disabled={pending}>
      {pending ? "Salvando..." : "Salvar"}
    </Button>
  );
}

export function ServiceItemForm({ service }: { service: ServiceItem }) {
  const { open, setOpen, message, setMessage } = useEditDialogState();
  const [, updateAction] = useActionState<ActionState, FormData>(async (previous, formData) => {
    const result = await updateServiceAction(previous, formData);

    setMessage(result.success ? "" : result.message);

    if (result.success) {
      setOpen(false);
    }

    return result;
  }, INITIAL_STATE);
  const [deleteState, deleteAction] = useActionState<ActionState, FormData>(deleteServiceAction, INITIAL_STATE);
  const formattedValue = currencyFormatter.format(Number(service.valor ?? 0));

  return (
    <ListRow
      title={service.nome}
      subtitle={`${service.duracao} min - ${formattedValue}`}
      hideSubtitleOnDesktop
      columns={[
        { label: "Duracao", value: `${service.duracao} min` },
        { label: "Valor", value: formattedValue },
      ]}
      status={<StatusPill tone={service.ativo ? "success" : "neutral"}>{service.ativo ? "Ativo" : "Inativo"}</StatusPill>}
      actions={
        <>
          <EditDialog
            title="Editar servico"
            label={`Editar ${service.nome}`}
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (next) setMessage("");
            }}
          >
            <form action={updateAction} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="id" value={service.id} />

              <div className="space-y-1 md:col-span-2">
                <label htmlFor={`servico-nome-${service.id}`} className="text-sm text-foreground">
                  Nome
                </label>
                <input id={`servico-nome-${service.id}`} name="nome" type="text" defaultValue={service.nome} className={FIELD_CLASS} required />
              </div>

              <div className="space-y-1">
                <label htmlFor={`servico-duracao-${service.id}`} className="text-sm text-foreground">
                  Duracao (min)
                </label>
                <input
                  id={`servico-duracao-${service.id}`}
                  name="duracao"
                  type="number"
                  min={1}
                  step={1}
                  defaultValue={service.duracao}
                  className={FIELD_CLASS}
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor={`servico-valor-${service.id}`} className="text-sm text-foreground">
                  Valor (R$)
                </label>
                <input
                  id={`servico-valor-${service.id}`}
                  name="valor"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={service.valor}
                  className={FIELD_CLASS}
                  required
                />
              </div>

              <label className="flex min-h-11 items-center gap-2 text-sm text-foreground md:col-span-2">
                <input name="ativo" type="checkbox" defaultChecked={service.ativo} className="h-4 w-4 accent-brand" />
                Servico ativo
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
          <ConfirmDelete title={service.nome} action={deleteAction} message={deleteState.success ? "" : deleteState.message}>
            <input type="hidden" name="id" value={service.id} />
          </ConfirmDelete>
        </>
      }
    />
  );
}
