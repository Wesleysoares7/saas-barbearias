"use client";

import { useRef, useState } from "react";

import { setCompanyStatusAction } from "@/app/master/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const FIELD_CLASS =
  "h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-base text-foreground outline-none focus:border-brand";

const OPTIONS = [
  { value: "trial", label: "Trial" },
  { value: "active", label: "Ativa" },
  { value: "past_due", label: "Em atraso" },
  { value: "suspended", label: "Suspensa" },
  { value: "canceled", label: "Cancelada" },
];

type CompanyStatusFormProps = {
  companyId: string;
  status: string;
  plan: string | null;
};

export function CompanyStatusForm({ companyId, status, plan }: CompanyStatusFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const selected = new FormData(event.currentTarget).get("status");

    if ((selected === "suspended" || selected === "canceled") && !confirmOpen) {
      event.preventDefault();
      setConfirmOpen(true);
    }
  }

  return (
    <>
      <form ref={formRef} action={setCompanyStatusAction} onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-3">
        <input type="hidden" name="companyId" value={companyId} />
        <div className="space-y-1">
          <label htmlFor="conta-status" className="text-sm text-foreground">
            Status
          </label>
          <select id="conta-status" name="status" defaultValue={status} className={FIELD_CLASS}>
            {OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="conta-plano" className="text-sm text-foreground">
            Plano
          </label>
          <input id="conta-plano" name="plan" maxLength={40} defaultValue={plan ?? ""} className={FIELD_CLASS} />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="min-h-11 w-full rounded-xl border border-border bg-surface-2 px-4 text-sm font-medium text-foreground transition hover:border-brand hover:text-brand sm:w-auto"
          >
            Salvar
          </button>
        </div>
      </form>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar alteracao de status</DialogTitle>
            <DialogDescription>
              A empresa perdera o acesso ao painel. O modo suporte continua funcionando.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="min-h-11 bg-rose-500 text-white hover:bg-rose-500/90"
              onClick={() => {
                formRef.current?.requestSubmit();
                setConfirmOpen(false);
              }}
            >
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}