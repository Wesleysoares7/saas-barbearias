"use client";

import { useState } from "react";

import { deleteMasterCompanyAction } from "@/app/master/actions";

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
      <button
        type="submit"
        disabled={typed !== companyName}
        className="min-h-11 rounded-xl bg-rose-500 px-4 text-sm font-semibold text-white transition hover:bg-rose-500/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Excluir empresa
      </button>
    </form>
  );
}
