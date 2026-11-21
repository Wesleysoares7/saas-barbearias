"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { setCompanyInfoAction } from "@/app/painel/configuracoes/actions";
import { Button } from "@/components/ui/button";

type ActionState = {
  success: boolean;
  message: string;
};

type CompanyInfo = {
  nome: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  email_contato: string | null;
};

const INITIAL_STATE: ActionState = { success: false, message: "" };

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="h-11 bg-brand text-brand-foreground hover:bg-brand/90"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Salvar dados
        </>
      ) : (
        "Salvar dados"
      )}
    </Button>
  );
}

export function CompanyInfoForm({ company }: { company: CompanyInfo }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    setCompanyInfoAction,
    INITIAL_STATE,
  );

  const [nome, setNome] = useState(company.nome ?? "");
  const [telefone, setTelefone] = useState(company.telefone ?? "");
  const [email_contato, setEmail_contato] = useState(company.email_contato ?? "");
  const [endereco, setEndereco] = useState(company.endereco ?? "");
  const [cidade, setCidade] = useState(company.cidade ?? "");
  const [uf, setUf] = useState(company.uf ?? "");

  return (
    <form action={formAction} key={JSON.stringify(company)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label
            htmlFor="nome"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Nome da empresa
          </label>
          <input
            type="text"
            id="nome"
            name="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={120}
            autoComplete="organization"
            required
            className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-brand"
          />
        </div>

        <div>
          <label
            htmlFor="telefone"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Telefone
          </label>
          <input
            type="tel"
            id="telefone"
            name="telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            maxLength={30}
            autoComplete="tel"
            className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-brand"
          />
        </div>

        <div>
          <label
            htmlFor="email_contato"
            className="block text-sm font-medium text-foreground mb-1"
          >
            E-mail de contato
          </label>
          <input
            type="email"
            id="email_contato"
            name="email_contato"
            value={email_contato}
            onChange={(e) => setEmail_contato(e.target.value)}
            maxLength={120}
            autoComplete="email"
            className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-brand"
          />
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="endereco"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Endereço
          </label>
          <input
            type="text"
            id="endereco"
            name="endereco"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            maxLength={200}
            autoComplete="street-address"
            className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-brand"
          />
        </div>

        <div>
          <label
            htmlFor="cidade"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Cidade
          </label>
          <input
            type="text"
            id="cidade"
            name="cidade"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            maxLength={60}
            autoComplete="address-level2"
            className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-brand"
          />
        </div>

        <div>
          <label
            htmlFor="uf"
            className="block text-sm font-medium text-foreground mb-1"
          >
            UF
          </label>
          <select
            id="uf"
            name="uf"
            value={uf}
            onChange={(e) => setUf(e.target.value)}
            autoComplete="address-level1"
            className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-brand"
          >
            <option value="">Selecione</option>
            {UFS.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.message ? (
        <p
          aria-live="polite"
          className={`rounded-lg border px-3 py-2 text-sm ${
            state.success
              ? "border-emerald-500/50 bg-emerald-600/15 text-emerald-200"
              : "border-amber-500/50 bg-amber-600/15 text-amber-200"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
