"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { deleteCustomerAction, updateCustomerAction } from "@/app/painel/clientes/actions";
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

export function CustomerItemForm({ customer }: { customer: CustomerItem }) {
  const [updateState, updateAction] = useActionState<ActionState, FormData>(updateCustomerAction, INITIAL_STATE);
  const [deleteState, deleteAction] = useActionState<ActionState, FormData>(deleteCustomerAction, INITIAL_STATE);
  const [isEditing, setIsEditing] = useState(false);
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
            style={updateState.success ? { animation: "customer-item-toast-fade 3.5s ease forwards" } : undefined}
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
            style={deleteState.success ? { animation: "customer-item-toast-fade 3.5s ease forwards" } : undefined}
          >
            {deleteState.message}
          </div>
        </div>
      ) : null}

      {shouldShowEditForm ? (
        <form action={updateAction} onSubmit={() => setIsEditing(false)} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="id" value={customer.id} />

          <div className="space-y-1 md:col-span-2">
            <label htmlFor={`cliente-nome-${customer.id}`} className="text-sm text-zinc-200">
              Nome
            </label>
            <input
              id={`cliente-nome-${customer.id}`}
              name="nome"
              type="text"
              defaultValue={customer.nome}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor={`cliente-telefone-${customer.id}`} className="text-sm text-zinc-200">
              Telefone
            </label>
            <input
              id={`cliente-telefone-${customer.id}`}
              name="telefone"
              type="text"
              defaultValue={customer.telefone ?? ""}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor={`cliente-email-${customer.id}`} className="text-sm text-zinc-200">
              E-mail
            </label>
            <input
              id={`cliente-email-${customer.id}`}
              name="email"
              type="email"
              defaultValue={customer.email ?? ""}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label htmlFor={`cliente-observacoes-${customer.id}`} className="text-sm text-zinc-200">
              Observacoes
            </label>
            <textarea
              id={`cliente-observacoes-${customer.id}`}
              name="observacoes"
              rows={3}
              defaultValue={customer.observacoes ?? ""}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-200 md:col-span-2">
            <input name="ativo" type="checkbox" defaultChecked={customer.ativo} className="h-4 w-4 accent-amber-400" />
            Cliente ativo
          </label>

          <div className="md:col-span-2 flex items-center justify-start gap-3">
            <UpdateButton />
            <Button type="button" variant="outline" className="h-9 border-border text-zinc-100" onClick={() => setIsEditing(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1 md:col-span-2">
            <p className="text-xs text-zinc-400">Nome</p>
            <p className="text-sm text-zinc-100">{customer.nome}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-zinc-400">Telefone</p>
            <p className="text-sm text-zinc-100">{customer.telefone?.trim() || "Nao informado"}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-zinc-400">E-mail</p>
            <p className="text-sm text-zinc-100">{customer.email?.trim() || "Nao informado"}</p>
          </div>

          <div className="space-y-1 md:col-span-2">
            <p className="text-xs text-zinc-400">Observacoes</p>
            <p className="text-sm text-zinc-100">{customer.observacoes?.trim() || "Sem observacoes"}</p>
          </div>

          <div className="space-y-1 md:col-span-2">
            <p className="text-xs text-zinc-400">Status</p>
            <p className="text-sm text-zinc-100">{customer.ativo ? "Ativo" : "Inativo"}</p>
          </div>

          <div className="md:col-span-2 flex items-center justify-start gap-3">
            <Button type="button" className="h-9 bg-amber-400 text-zinc-950 hover:bg-amber-300" onClick={() => setIsEditing(true)}>
              Editar
            </Button>
          </div>
        </div>
      )}

      <form action={deleteAction} className="mt-3 flex items-center justify-end gap-3">
        <Link
          href={`/painel/clientes/${customer.id}`}
          className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm text-zinc-100 transition hover:border-amber-400 hover:text-amber-300"
        >
          Ver historico
        </Link>
        <input type="hidden" name="id" value={customer.id} />
        <DeleteButton />
      </form>

      <style jsx>{`
        @keyframes customer-item-toast-fade {
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
