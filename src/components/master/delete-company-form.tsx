"use client";

import { useState } from "react";

import { deleteMasterCompanyAction } from "@/app/master/actions";
import { PendingButton } from "@/components/ui/pending-button";

export function DeleteCompanyForm({ companyId, companyName }: { companyId: string; companyName: string }) {
  const [typed, setTyped] = useState("");

  return (
    <form action={deleteMasterCompanyAction} className="space-y-3">
      <input type="hidden" name="id" value={companyId} />
      <div className="space-y-1">
        <label htmlFor="empresa-excluir-confirmacao" className="text-sm text-foreground">
          Digite o nome da empresa para confirmar
        </label>
        <input
          id="empresa-excluir-confirmacao"
          name="nome_confirmacao"
          required
          autoComplete="off"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder={companyName}
          className="h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-base text-foreground outline-none focus:border-rose-400"
        />
      </div>
      <PendingButton
        type="submit"
        variant="ghost"
        disabled={typed !== companyName}
        pendingLabel="Excluindo..."
        className="h-auto min-h-11 gap-2 bg-rose-500 px-4 text-white hover:bg-rose-500/90 hover:text-white disabled:cursor-not-allowed"
      >
        Excluir empresa
      </PendingButton>
    </form>
  );
}
