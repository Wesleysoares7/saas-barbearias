"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { deleteEmployeeAction, updateEmployeeAction } from "@/app/painel/funcionarios/actions";

type EmployeeItem = {
  id: string;
  nome: string;
  telefone: string | null;
  percentual_comissao: number;
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
    <Button type="submit" className="h-9 bg-amber-400 text-zinc-950 hover:bg-amber-300" disabled={pending}>
      {pending ? "Salvando..." : "Salvar"}
    </Button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" className="h-9 border-zinc-600 text-zinc-100" disabled={pending}>
      {pending ? "Excluindo..." : "Excluir"}
    </Button>
  );
}

export function EmployeeItemForm({ employee }: { employee: EmployeeItem }) {
  const [updateState, updateAction] = useActionState<ActionState, FormData>(updateEmployeeAction, INITIAL_STATE);
  const [deleteState, deleteAction] = useActionState<ActionState, FormData>(deleteEmployeeAction, INITIAL_STATE);
  const [isEditing, setIsEditing] = useState(false);
  const shouldShowEditForm = isEditing || (!updateState.success && Boolean(updateState.message));

  return (
    <article className="rounded-xl border border-zinc-700/60 bg-zinc-950/60 p-4">
      {updateState.message ? (
        <div className="sticky top-3 z-20 mb-3 flex justify-center" aria-live="polite">
          <div
            className={`w-full rounded-lg border px-4 py-3 text-sm font-medium ${
              updateState.success
                ? "border-emerald-500/50 bg-emerald-600/15 text-emerald-200"
                : "border-amber-500/50 bg-amber-600/15 text-amber-200"
            }`}
            style={updateState.success ? { animation: "employee-item-toast-fade 3.5s ease forwards" } : undefined}
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
            style={deleteState.success ? { animation: "employee-item-toast-fade 3.5s ease forwards" } : undefined}
          >
            {deleteState.message}
          </div>
        </div>
      ) : null}

      {shouldShowEditForm ? (
        <form action={updateAction} onSubmit={() => setIsEditing(false)} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="id" value={employee.id} />

          <div className="space-y-1 md:col-span-2">
            <label htmlFor={`funcionario-nome-${employee.id}`} className="text-sm text-zinc-200">
              Nome
            </label>
            <input
              id={`funcionario-nome-${employee.id}`}
              name="nome"
              type="text"
              defaultValue={employee.nome}
              className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor={`funcionario-telefone-${employee.id}`} className="text-sm text-zinc-200">
              Telefone
            </label>
            <input
              id={`funcionario-telefone-${employee.id}`}
              name="telefone"
              type="tel"
              defaultValue={employee.telefone ?? ""}
              className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor={`funcionario-comissao-${employee.id}`} className="text-sm text-zinc-200">
              Comissao (%)
            </label>
            <input
              id={`funcionario-comissao-${employee.id}`}
              name="percentual_comissao"
              type="number"
              min={0}
              max={100}
              step="0.01"
              defaultValue={employee.percentual_comissao}
              className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
              required
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-200 md:col-span-2">
            <input name="ativo" type="checkbox" defaultChecked={employee.ativo} className="h-4 w-4 accent-amber-400" />
            Funcionario ativo
          </label>

          <div className="md:col-span-2 flex items-center justify-start gap-3">
            <UpdateButton />
            <Button
              type="button"
              variant="outline"
              className="h-9 border-zinc-600 text-zinc-100"
              onClick={() => setIsEditing(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1 md:col-span-2">
            <p className="text-xs text-zinc-400">Nome</p>
            <p className="text-sm text-zinc-100">{employee.nome}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-zinc-400">Telefone</p>
            <p className="text-sm text-zinc-100">{employee.telefone?.trim() || "Nao informado"}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-zinc-400">Comissao (%)</p>
            <p className="text-sm text-zinc-100">{employee.percentual_comissao}</p>
          </div>

          <div className="space-y-1 md:col-span-2">
            <p className="text-xs text-zinc-400">Status</p>
            <p className="text-sm text-zinc-100">{employee.ativo ? "Ativo" : "Inativo"}</p>
          </div>

          <div className="md:col-span-2 flex items-center justify-start gap-3">
            <Button type="button" className="h-9 bg-amber-400 text-zinc-950 hover:bg-amber-300" onClick={() => setIsEditing(true)}>
              Editar
            </Button>
          </div>
        </div>
      )}

      <form action={deleteAction} className="mt-3 flex items-center justify-end gap-3">
        <input type="hidden" name="id" value={employee.id} />
        <DeleteButton />
      </form>

      <style jsx>{`
        @keyframes employee-item-toast-fade {
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
