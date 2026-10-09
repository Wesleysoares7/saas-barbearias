"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { updateProductAction } from "@/app/painel/estoque/actions";
import { StockMovementDialog } from "@/components/painel/estoque/stock-movement-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { STOCK_UNITS, type Product } from "@/types/stock";

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

function UpdateButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="min-h-11 bg-brand text-brand-foreground hover:bg-brand/90" disabled={pending}>
      {pending ? "Salvando..." : "Salvar"}
    </Button>
  );
}

function EditProductForm({ product, onSuccess }: { product: Product; onSuccess: () => void }) {
  const [state, formAction] = useActionState<ActionState, FormData>(updateProductAction, INITIAL_STATE);
  const [handledMessage, setHandledMessage] = useState<string | null>(null);

  if (state.success && state.message !== handledMessage) {
    setHandledMessage(state.message);
    onSuccess();
  }

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="id" value={product.id} />

      {state.message && !state.success ? (
        <p className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 md:col-span-2" aria-live="polite">
          {state.message}
        </p>
      ) : null}

      <div className="space-y-1 md:col-span-2">
        <label htmlFor={`produto-nome-${product.id}`} className="text-sm text-foreground">
          Nome
        </label>
        <input id={`produto-nome-${product.id}`} name="nome" type="text" defaultValue={product.nome} className={FIELD_CLASS} required />
      </div>

      <div className="space-y-1">
        <label htmlFor={`produto-categoria-${product.id}`} className="text-sm text-foreground">
          Categoria
        </label>
        <input
          id={`produto-categoria-${product.id}`}
          name="categoria"
          type="text"
          defaultValue={product.categoria ?? ""}
          className={FIELD_CLASS}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor={`produto-sku-${product.id}`} className="text-sm text-foreground">
          SKU
        </label>
        <input id={`produto-sku-${product.id}`} name="sku" type="text" defaultValue={product.sku ?? ""} className={FIELD_CLASS} />
      </div>

      <div className="space-y-1">
        <label htmlFor={`produto-unidade-${product.id}`} className="text-sm text-foreground">
          Unidade
        </label>
        <select id={`produto-unidade-${product.id}`} name="unidade" defaultValue={product.unidade} className={FIELD_CLASS}>
          {STOCK_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor={`produto-minimo-${product.id}`} className="text-sm text-foreground">
          Estoque minimo
        </label>
        <input
          id={`produto-minimo-${product.id}`}
          name="estoque_minimo"
          type="number"
          min={0}
          step="0.001"
          defaultValue={product.estoque_minimo}
          className={FIELD_CLASS}
        />
      </div>

      <label className="flex min-h-11 items-center gap-2 text-sm text-foreground md:col-span-2">
        <input name="ativo" type="checkbox" defaultChecked={product.ativo} className="size-4 accent-[#F5B301]" />
        Produto ativo
      </label>

      <div className="md:col-span-2">
        <UpdateButton />
      </div>
    </form>
  );
}

export function ProductActions({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <StockMovementDialog productId={product.id} productName={product.nome} unidade={product.unidade} tipo="entrada" />
      <StockMovementDialog productId={product.id} productName={product.nome} unidade={product.unidade} tipo="saida" />
      <Button type="button" variant="outline" className="min-h-11 flex-1 border-border sm:flex-none" onClick={() => setOpen(true)}>
        Editar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar produto</DialogTitle>
          </DialogHeader>
          <EditProductForm product={product} onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
