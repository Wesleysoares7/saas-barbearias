"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { setThemeAction } from "@/app/painel/configuracoes/actions";
import { Button } from "@/components/ui/button";
import { THEMES, type ThemeId } from "@/lib/themes";

type ActionState = {
  success: boolean;
  message: string;
};

const INITIAL_STATE: ActionState = { success: false, message: "" };

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
          Salvando...
        </>
      ) : (
        "Salvar tema"
      )}
    </Button>
  );
}

export function ThemeForm({ currentTheme }: { currentTheme: ThemeId }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    setThemeAction,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="sr-only">Tema de cores</legend>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {THEMES.map((theme) => (
            <label
              key={theme.value}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface-2 p-3 transition hover:border-brand/60 has-[input:checked]:border-brand has-[input:checked]:bg-brand/10 has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ring"
            >
              <input
                type="radio"
                name="tema"
                value={theme.value}
                defaultChecked={theme.value === currentTheme}
                className="sr-only"
              />

              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                style={{
                  backgroundColor: theme.brand,
                  color: theme.brandForeground,
                }}
              >
                Aa
              </span>

              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">
                  {theme.label}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {theme.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

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
