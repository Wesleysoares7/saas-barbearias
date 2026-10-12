"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { createTeamInviteAction } from "@/app/painel/equipe/actions";
import { Button } from "@/components/ui/button";

type ActionState = {
  success: boolean;
  message: string;
};

type Profile = "funcionario" | "recepcao" | "admin";

const PROFILES: Array<{ value: Profile; label: string; hint: string }> = [
  { value: "funcionario", label: "Funcionario", hint: "Atende clientes; ve so a propria agenda e a propria comissao." },
  { value: "recepcao", label: "Recepcao", hint: "Ve e agenda para todos; sem acesso a financeiro." },
  { value: "admin", label: "Administrador", hint: "Acesso total." },
];

const INITIAL_STATE: ActionState = {
  success: false,
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="min-h-11 bg-amber-400 text-zinc-950 hover:bg-amber-300" disabled={pending}>
      {pending ? "Salvando..." : "Criar convite"}
    </Button>
  );
}

export function CreateTeamInviteForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(createTeamInviteAction, INITIAL_STATE);
  const [profile, setProfile] = useState<Profile>("funcionario");
  const [adminAtende, setAdminAtende] = useState(false);
  const role = profile === "admin" ? "admin" : "employee";
  const atendeClientes = profile === "funcionario" || (profile === "admin" && adminAtende);

  return (
    <>
      {state.message ? (
        <div className="mb-3" aria-live="polite">
          <div
            className={`w-full rounded-lg border px-4 py-3 text-sm font-medium ${
              state.success
                ? "border-emerald-500/50 bg-emerald-600/15 text-emerald-200"
                : "border-amber-500/50 bg-amber-600/15 text-amber-200"
            }`}
          >
            {state.message}
          </div>
        </div>
      ) : null}

      <form action={formAction} className="grid gap-3 rounded-xl border border-border bg-surface-2 p-4 md:grid-cols-3">
        <div className="space-y-1 md:col-span-2">
          <label htmlFor="invite-email" className="text-sm text-zinc-200">
            E-mail do novo membro
          </label>
          <input
            id="invite-email"
            name="email"
            type="email"
            className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
            placeholder="usuario@empresa.com"
            required
          />
        </div>

        <fieldset className="space-y-2 md:col-span-3">
          <legend className="mb-1 text-sm text-zinc-200">Perfil</legend>
          <input type="hidden" name="role" value={role} />
          {atendeClientes ? <input type="hidden" name="atende_clientes" value="on" /> : null}
          <div className="grid gap-2 md:grid-cols-3">
            {PROFILES.map((item) => (
              <label
                key={item.value}
                className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                  profile === item.value ? "border-brand bg-brand/10" : "border-border bg-surface"
                }`}
              >
                <input
                  type="radio"
                  name="perfil"
                  value={item.value}
                  checked={profile === item.value}
                  onChange={() => setProfile(item.value)}
                  className="mt-0.5 size-5 shrink-0 accent-amber-400"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-zinc-100">{item.label}</span>
                  <span className="block text-xs text-zinc-400">{item.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-1 md:col-span-3">
          <label htmlFor="invite-nome" className="text-sm text-zinc-200">
            Nome do membro (opcional)
          </label>
          <input id="invite-nome" name="nome" type="text" maxLength={120} className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-base text-zinc-100 outline-none focus:border-amber-400" />
        </div>

        {profile === "admin" ? (
          <label htmlFor="admin-atende" className="flex min-h-11 items-center gap-3 text-sm text-zinc-200 md:col-span-3">
            <input
              id="admin-atende"
              type="checkbox"
              checked={adminAtende}
              onChange={(event) => setAdminAtende(event.target.checked)}
              className="size-5 accent-amber-400"
            />
            Tambem atende clientes
          </label>
        ) : null}

        {atendeClientes ? (
          <>
            <div className="space-y-1 md:col-span-2">
              <label htmlFor="invite-telefone" className="text-sm text-zinc-200">
                Telefone (opcional)
              </label>
              <input id="invite-telefone" name="telefone" type="tel" inputMode="tel" maxLength={30} className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-base text-zinc-100 outline-none focus:border-amber-400" />
            </div>
            <div className="space-y-1">
              <label htmlFor="invite-comissao" className="text-sm text-zinc-200">
                Comissao % (opcional)
              </label>
              <input id="invite-comissao" name="comissao" type="text" inputMode="decimal" placeholder="0 a 100" className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-base text-zinc-100 outline-none focus:border-amber-400" />
            </div>
          </>
        ) : null}

        <div className="md:col-span-3">
          <SubmitButton />
        </div>
      </form>
    </>
  );
}
