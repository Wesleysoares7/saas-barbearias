"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

function normalizePublicSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function BookingEntryForm() {
  const router = useRouter();
  const [rawSlug, setRawSlug] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const slug = normalizePublicSlug(rawSlug);

    if (!slug || slug.length < 3) {
      setErrorMessage("Informe um codigo valido da barbearia.");
      return;
    }

    setErrorMessage("");
    router.push(`/agendar/${slug}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <label htmlFor="barbershopCode" className="block text-sm font-medium text-zinc-200">
          Codigo da barbearia
        </label>
        <input
          id="barbershopCode"
          name="barbershopCode"
          type="text"
          value={rawSlug}
          onChange={(event) => {
            setRawSlug(event.target.value);
            setErrorMessage("");
          }}
          placeholder="Ex.: barbearia-premium"
          className="h-11 w-full rounded-lg border border-zinc-700/80 bg-zinc-950/80 px-3 text-sm text-zinc-100 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-400/20"
          aria-invalid={Boolean(errorMessage)}
        />
        <p className="text-xs text-zinc-400">Peca esse codigo para a sua barbearia.</p>
      </div>

      <Button type="submit" className="h-11 w-full">
        Continuar para agendamento
      </Button>

      {errorMessage ? <p className="text-sm text-amber-300">{errorMessage}</p> : null}
    </form>
  );
}
