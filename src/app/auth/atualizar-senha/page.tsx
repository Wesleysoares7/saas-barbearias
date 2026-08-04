"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type PasswordFormErrors = {
  password?: string;
  confirmPassword?: string;
  form?: string;
};

function validatePassword(password: string, confirmPassword: string): PasswordFormErrors {
  const errors: PasswordFormErrors = {};

  if (!password.trim()) {
    errors.password = "Informe a nova senha.";
  } else if (password.length < 6) {
    errors.password = "A senha deve ter pelo menos 6 caracteres.";
  }

  if (!confirmPassword.trim()) {
    errors.confirmPassword = "Confirme a nova senha.";
  } else if (confirmPassword !== password) {
    errors.confirmPassword = "As senhas nao conferem.";
  }

  return errors;
}

export default function AtualizarSenhaPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<PasswordFormErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validatePassword(password, confirmPassword);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setErrors({ form: `Nao foi possivel atualizar a senha: ${error.message}` });
        return;
      }

      setSuccessMessage("Senha atualizada com sucesso. Redirecionando para o login...");
      setTimeout(() => {
        router.replace("/login");
        router.refresh();
      }, 1200);
    } catch {
      setErrors({ form: "Ocorreu um erro inesperado ao atualizar sua senha." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.25),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(255,255,255,0.08),_transparent_40%)]" />

      <section className="relative z-10 w-full max-w-md rounded-2xl border border-amber-400/20 bg-zinc-900/85 p-6 shadow-2xl backdrop-blur sm:p-8">
        <div className="mb-6 space-y-2 text-center">
          <p className="text-xs font-semibold tracking-[0.22em] text-amber-300 uppercase">Recuperacao de senha</p>
          <h1 className="text-2xl font-semibold text-zinc-100">Defina sua nova senha</h1>
          <p className="text-sm text-zinc-300">Crie uma senha segura para voltar a acessar sua conta.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-zinc-200">
              Nova senha
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 w-full rounded-lg border border-zinc-700/80 bg-zinc-950/80 px-3 pr-24 text-sm text-zinc-100 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                placeholder="********"
                aria-invalid={Boolean(errors.password)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((previous) => !previous)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium text-amber-300 hover:text-amber-200"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            {errors.password ? <p className="text-sm text-amber-300">{errors.password}</p> : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm-password" className="block text-sm font-medium text-zinc-200">
              Confirmar nova senha
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="h-11 w-full rounded-lg border border-zinc-700/80 bg-zinc-950/80 px-3 pr-24 text-sm text-zinc-100 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                placeholder="********"
                aria-invalid={Boolean(errors.confirmPassword)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((previous) => !previous)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium text-amber-300 hover:text-amber-200"
                aria-label={showConfirmPassword ? "Ocultar confirmacao de senha" : "Mostrar confirmacao de senha"}
              >
                {showConfirmPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            {errors.confirmPassword ? <p className="text-sm text-amber-300">{errors.confirmPassword}</p> : null}
          </div>

          <Button
            type="submit"
            className="h-11 w-full bg-amber-400 text-zinc-950 hover:bg-amber-300"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Atualizando..." : "Atualizar senha"}
          </Button>

          {errors.form ? <p className="text-sm text-amber-300">{errors.form}</p> : null}
          {successMessage ? <p className="text-sm text-emerald-300">{successMessage}</p> : null}
        </form>
      </section>
    </main>
  );
}
