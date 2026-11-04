"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const noop = () => {};

const FormDialogContext = createContext<() => void>(noop);

export function useCloseFormDialog(): () => void {
  return useContext(FormDialogContext);
}

export function useCloseOnSuccess(success: boolean, delayMs = 1000): void {
  const close = useCloseFormDialog();
  const closeRef = useRef(close);

  useEffect(() => {
    closeRef.current = close;
  }, [close]);

  useEffect(() => {
    if (!success) {
      return;
    }

    const timer = setTimeout(() => closeRef.current(), delayMs);

    return () => clearTimeout(timer);
  }, [success, delayMs]);
}

type FormDialogProps = {
  trigger: ReactElement;
  title: string;
  contentClassName?: string;
  children: ReactNode;
};

export function FormDialog({ trigger, title, contentClassName, children }: FormDialogProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className={contentClassName}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <FormDialogContext.Provider value={close}>{children}</FormDialogContext.Provider>
      </DialogContent>
    </Dialog>
  );
}
