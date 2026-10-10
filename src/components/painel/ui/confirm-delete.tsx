"use client";

import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";

import { ROW_ICON_BUTTON_CLASS } from "@/components/painel/ui/list-row";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type ConfirmDeleteProps = {
  title: string;
  description?: string;
  action: (formData: FormData) => void;
  message?: string;
  triggerLabel?: string;
  children: ReactNode;
};

function ConfirmButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="min-h-11 bg-rose-500 text-white hover:bg-rose-500/90" disabled={pending}>
      {pending ? "Excluindo..." : "Confirmar"}
    </Button>
  );
}

export function ConfirmDelete({ title, description, action, message, triggerLabel, children }: ConfirmDeleteProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerLabel ? (
          <Button type="button" variant="outline" className="min-h-11 border-border text-rose-300">
            <Trash2 className="size-4" />
            {triggerLabel}
          </Button>
        ) : (
          <button type="button" className={`${ROW_ICON_BUTTON_CLASS} text-rose-300`} aria-label={`Excluir ${title}`} title="Excluir">
            <Trash2 className="size-4" />
          </button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir {title}?</DialogTitle>
          <DialogDescription>{description ?? "Esta acao nao pode ser desfeita."}</DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-3">
          {children}

          {message ? (
            <p className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200" aria-live="polite">
              {message}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="min-h-11 border-border" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <ConfirmButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}