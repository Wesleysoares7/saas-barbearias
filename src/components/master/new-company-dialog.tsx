"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { createMasterCompanyAction } from "@/app/master/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const FIELD_CLASS =
  "h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-base text-foreground outline-none focus:border-brand";

export function NewCompanyDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-foreground hover:bg-brand/90"
        >
          <Plus className="size-4" />
          Nova empresa
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova empresa</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData: FormData) => {
            await createMasterCompanyAction(formData);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <div className="space-y-1">
            <label htmlFor="nova-empresa-nome" className="text-sm text-foreground">
              Nome da empresa
            </label>
            <input id="nova-empresa-nome" name="nome" required minLength={2} className={FIELD_CLASS} />
          </div>
          <div className="space-y-1">
            <label htmlFor="nova-empresa-telefone" className="text-sm text-foreground">
              Telefone
            </label>
            <input id="nova-empresa-telefone" name="telefone" className={FIELD_CLASS} />
          </div>
          <div className="space-y-1">
            <label htmlFor="nova-empresa-endereco" className="text-sm text-foreground">
              Endereco
            </label>
            <input id="nova-empresa-endereco" name="endereco" className={FIELD_CLASS} />
          </div>
          <button
            type="submit"
            className="min-h-11 w-full rounded-xl bg-brand px-4 text-sm font-semibold text-brand-foreground hover:bg-brand/90"
          >
            Incluir empresa
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
