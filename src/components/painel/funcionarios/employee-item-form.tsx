"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { deleteEmployeeAction, updateEmployeeAction } from "@/app/painel/funcionarios/actions";
import { ConfirmDelete } from "@/components/painel/ui/confirm-delete";
import { EditDialog, FIELD_CLASS, useEditDialogState } from "@/components/painel/ui/edit-dialog";
import { getInitials, ListRow } from "@/components/painel/ui/list-row";
import { StatusPill } from "@/components/painel/ui/status-pill";
import { Button } from "@/components/ui/button";

type EmployeeItem = {
  id: string;
  nome: string;
  telefone: string | null;
  percentual_comissao: number | null;
  ativo: boolean;
  email?: string | null;
  user_id?: string | null;
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

export function EmployeeItemForm({ employee }: { employee: EmployeeItem }) {
  const { open, setOpen, message, setMessage } = useEditDialogState();
  const [, updateAction] = useActionState<ActionState, FormData>(async (previous, formData) => {
    const result = await updateEmployeeAction(previous, formData);

    setMessage(result.success ? "" : result.message);

    if (result.success) {
      setOpen(false);
    }

    return result;
  }, INITIAL_STATE);
  const [deleteState, deleteAction] = useActionState<ActionState, FormData>(deleteEmployeeAction, INITIAL_STATE);

  return (
    <ListRow
      leading={getInitials(employee.nome)}
      title={employee.nome}
      subtitle={employee.telefone?.trim() || "Sem telefone"}
      columns={[
        { label: "E-mail", value: employee.email?.trim() || "-" },
        {
          label: "Comissao (%)",
          value: employee.percentual_comissao === null || employee.percentual_comissao === undefined ? "-" : String(employee.percentual_comissao),
        },
      ]}
      status={
        <span className="inline-flex flex-wrap gap-1">
          <StatusPill tone={employee.ativo ? "success" : "neutral"}>{employee.ativo ? "Ativo" : "Inativo"}</StatusPill>
          {employee.user_id ? <StatusPill tone="brand">Com acesso ao sistema</StatusPill> : null}
        </span>
      }
      actions={
        <>
          <EditDialog
            title="Editar funcionario"
            label={`Editar ${employee.nome}`}
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (next) setMessage("");
            }}
          >
            <form action={updateAction} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="id" value={employee.id} />

              <div className="space-y-1 md:col-span-2">
                <label htmlFor={`funcionario-nome-${employee.id}`} className="text-sm text-foreground">
                  Nome
                </label>
                <input id={`funcionario-nome-${employee.id}`} name="nome" type="text" defaultValue={employee.nome} className={FIELD_CLASS} required />
              </div>

              <div className="space-y-1">
                <label htmlFor={`funcionario-telefone-${employee.id}`} className="text-sm text-foreground">
                  Telefone
                </label>
                <input
                  id={`funcionario-telefone-${employee.id}`}
                  name="telefone"
                  type="tel"
                  defaultValue={employee.telefone ?? ""}
                  className={FIELD_CLASS}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor={`funcionario-comissao-${employee.id}`} className="text-sm text-foreground">
                  Comissao (%) (opcional)
                </label>
                <input
                  id={`funcionario-comissao-${employee.id}`}
                  name="percentual_comissao"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  defaultValue={employee.percentual_comissao ?? ""}
                  className={FIELD_CLASS}
                />
              </div>

              <label className="flex min-h-11 items-center gap-2 text-sm text-foreground md:col-span-2">
                <input name="ativo" type="checkbox" defaultChecked={employee.ativo} className="h-4 w-4 accent-brand" />
                Funcionario ativo
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
          <ConfirmDelete title={employee.nome} action={deleteAction} message={deleteState.success ? "" : deleteState.message}>
            <input type="hidden" name="id" value={employee.id} />
          </ConfirmDelete>
        </>
      }
    />
  );
}
