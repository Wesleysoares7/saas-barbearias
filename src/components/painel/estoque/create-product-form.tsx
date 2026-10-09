"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { createProductAction } from "@/app/painel/estoque/actions";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { STOCK_UNITS } from "@/types/stock";

type ActionState = {
  success: boolean;
  message: string;
};

const INITIAL_STATE: ActionState = {
  success: false,
  message: "",
};

const FIELD_CLASS =
  "h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-base text-foreground outline-none focus:border-brand";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="h-11 bg-brand text-brand-foreground hover:bg-brand/90" disabled={pending}>
      {pending ? "Salvando..." : "Adicionar produto"}
    </Button>
  );
}

export function CreateProductForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, formAction] = useActionState<ActionState, FormData>(createProductAction, INITIAL_STATE);
  const [handledMessage, setHandledMessage] = useState<string | null>(null);

  if (state.success && state.message !== handledMessage) {
    setHandledMessage(state.message);
    onSuccess?.();
  }

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-2">
      {state.message && !state.success ? (
        <p className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 md:col-span-2" aria-live="polite">
          {state.message}
        </p>
      ) : null}

      <div className="space-y-1 md:col-span-2">
        <label htmlFor="novo-produto-nome" className="text-sm text-foreground">
          Nome
        </label>
        <input id="novo-produto-nome" name="nome" type="text" className={FIELD_CLASS} placeholder="Ex.: Pomada modeladora" required />
      </div>

      <div className="space-y-1">
        <label htmlFor="novo-produto-categoria" className="text-sm text-foreground">
          Categoria
        </label>
        <input id="novo-produto-categoria" name="categoria" type="text" className={FIELD_CLASS} placeholder="Ex.: Finalizadores" />
      </div>

      <div className="space-y-1">
        <label htmlFor="novo-produto-sku" className="text-sm text-foreground">
          SKU
        </label>
        <input id="novo-produto-sku" name="sku" type="text" className={FIELD_CLASS} />
      </div>

      <div className="space-y-1">
        <label htmlFor="novo-produto-unidade" className="text-sm text-foreground">
          Unidade
        </label>
        <select id="novo-produto-unidade" name="unidade" defaultValue="un" className={FIELD_CLASS}>
          {STOCK_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="novo-produto-minimo" className="text-sm text-foreground">
          Estoque minimo
        </label>
        <input
          id="novo-produto-minimo"
          name="estoque_minimo"
          type="number"
          min={0}
          step="0.001"
          defaultValue={0}
          className={FIELD_CLASS}
        />
      </div>

      <label className="flex min-h-11 items-center gap-2 text-sm text-foreground md:col-span-2">
        <input name="ativo" type="checkbox" defaultChecked className="size-4 accent-[#F5B301]" />
        Produto ativo
      </label>

      <div className="md:col-span-2">
        <SubmitButton />
      </div>
    </form>
  );
}

export function CreateProductDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="min-h-11 bg-brand text-brand-foreground hover:bg-brand/90">
          <Plus className="mr-2 size-4" />
          Novo produto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo produto</DialogTitle>
        </DialogHeader>
        <CreateProductForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
