"use client";

import { useState, type ReactNode } from "react";
import { Pencil } from "lucide-react";

import { ROW_ICON_BUTTON_CLASS } from "@/components/painel/ui/list-row";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type EditDialogProps = {
  title: string;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

export function EditDialog({ title, label, open, onOpenChange, children }: EditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button type="button" className={ROW_ICON_BUTTON_CLASS} aria-label={label} title="Editar">
          <Pencil className="size-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function useEditDialogState() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  return { open, setOpen, message, setMessage };
}

export const FIELD_CLASS =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-base text-foreground outline-none focus:border-brand";
