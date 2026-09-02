import { Button } from "@/components/ui/button";

type CustomerItem = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  observacoes: string | null;
  ativo: boolean;
};

export function CustomerItemForm({ customer }: { customer: CustomerItem }) {
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
          <Button type="button" className="h-8 w-8 p-0 bg-amber-400 text-zinc-950 hover:bg-amber-300">
            Editar
          </Button>
        </div>
      </div>
    </article>
  );
}