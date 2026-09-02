"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { deleteCustomerAction, updateCustomerAction } from "@/app/painel/clientes/actions";

type CustomerItem = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  observacoes: string | null;
  ativo: boolean;
};

export function CustomerCard({ customer }: { customer: CustomerItem }) {
  const [isEditing, setIsEditing] = useState(false);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-zinc-900/50 p-3">
        <form action={updateCustomerAction} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="id" value={customer.id} />
          
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm text-zinc-200">Nome</label>
            <input
              name="nome"
              type="text"
              defaultValue={customer.nome}
              className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
              placeholder="Ex.: Joao Silva"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-zinc-200">Telefone</label>
            <input
              name="telefone"
              type="text"
              defaultValue={customer.telefone || ""}
              className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
              placeholder="(11) 99999-9999"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-zinc-200">E-mail</label>
            <input
              name="email"
              type="email"
              defaultValue={customer.email || ""}
              className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
              placeholder="cliente@email.com"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-sm text-zinc-200">Observacoes</label>
            <textarea
              name="observacoes"
              rows={3}
              defaultValue={customer.observacoes || ""}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400"
              placeholder="Preferencias, alergias, anotacoes importantes..."
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-200 md:col-span-2">
            <input 
              name="ativo" 
              type="checkbox" 
              defaultChecked={customer.ativo}
              className="h-4 w-4 accent-amber-400" 
            />
            Cliente ativo
          </label>

          <div className="md:col-span-2 flex items-center justify-start gap-3">
            <Button type="submit" className="h-11 bg-amber-400 text-zinc-950 hover:bg-amber-300">
              Salvar
            </Button>
            <Button 
              type="button" 
              className="h-11 border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              onClick={handleCancelEdit}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <article className="rounded-lg border border-zinc-700/40 bg-zinc-900/50 p-2.5 hover:border-zinc-600/60 transition-colors h-full">
      <div className="grid gap-2 md:grid-cols-2">
        <div className="space-y-1 md:col-span-2">
          <p className="text-xs text-zinc-400">Nome</p>
          <p className="text-sm text-zinc-100 truncate">{customer.nome}</p>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-zinc-400">Telefone</p>
          <p className="text-sm text-zinc-100 truncate">{customer.telefone?.trim() || "Nao informado"}</p>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-zinc-400">E-mail</p>
          <p className="text-sm text-zinc-100 truncate">{customer.email?.trim() || "Nao informado"}</p>
        </div>

        <div className="space-y-1 md:col-span-2">
          <p className="text-xs text-zinc-400">Observacoes</p>
          <p className="text-sm text-zinc-100 line-clamp-2">{customer.observacoes?.trim() || "Sem observacoes"}</p>
        </div>

        <div className="space-y-1 md:col-span-2">
          <p className="text-xs text-zinc-400">Status</p>
          <p className="text-sm text-zinc-100">{customer.ativo ? "Ativo" : "Inativo"}</p>
        </div>

        <div className="md:col-span-2 flex items-center justify-start gap-2">
          <Button 
            type="button" 
            className="h-8 w-8 p-0 bg-amber-400 text-zinc-950 hover:bg-amber-300"
            onClick={handleEditClick}
          >
            <Edit className="h-4 w-4" />
          </Button>
          
          <form action={deleteCustomerAction}>
            <input type="hidden" name="id" value={customer.id} />
            <Button type="submit" className="h-8 w-8 p-0 bg-red-500 text-zinc-100 hover:bg-red-600">
              <Trash2 className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </article>
  );
}