"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ChevronDown, Loader2 } from "lucide-react";

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
      className="h-12 w-full bg-brand text-brand-foreground hover:bg-brand/90 sm:h-11 sm:w-auto"
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
  const [open, setOpen] = useState(false);

  const [state, formAction] = useActionState<ActionState, FormData>(
    async (previousState, formData) => {
      const result = await setThemeAction(previousState, formData);

      if (result.success) {
        setOpen(false);
      }

      return result;
    },
    INITIAL_STATE,
  );

  const current =
    THEMES.find((theme) => theme.value === currentTheme) ?? THEMES[0];

  return (
    <form action={formAction} className="space-y-3">
      <details
        open={open}
        onToggle={(event) => setOpen(event.currentTarget.open)}
        className="group rounded-xl border border-border bg-surface"
      >
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
            style={{
              backgroundColor: current.brand,
              color: current.brandForeground,
            }}
          >
            Aa
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-xs text-muted-foreground">
              Tema atual
            </span>
            <span className="block truncate text-sm font-medium text-foreground">
              {current.label}
            </span>
          </span>

          <span className="flex items-center gap-1 text-sm font-medium text-brand">
            <span className="group-open:hidden">Alterar</span>
            <span className="hidden group-open:inline">Fechar</span>
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
          </span>
        </summary>

        <div className="space-y-4 border-t border-border p-3">
          <fieldset className="space-y-2">
            <legend className="sr-only">Tema de cores</legend>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {THEMES.map((theme) => (
                <label
                  key={theme.value}
                  className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface-2 p-3 transition hover:border-brand/60 has-[input:checked]:border-brand has-[input:checked]:bg-brand/10 has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ring"
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

          <SubmitButton />
        </div>
      </details>

      {state.message ? (
        <p
          aria-live="polite"
          role="status"
          className={`rounded-lg border px-3 py-2 text-sm ${
            state.success
              ? "border-emerald-500/50 bg-emerald-600/15 text-emerald-200"
              : "border-amber-500/50 bg-amber-600/15 text-amber-200"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
