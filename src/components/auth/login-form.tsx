"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup" | "recover";

type LoginFormState = {
  email: string;
  password: string;
};

type LoginFormErrors = {
  email?: string;
  password?: string;
  form?: string;
};

const INITIAL_STATE: LoginFormState = {
  email: "",
  password: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_PUBLIC_APP_URL = "https://saas-barbearias.vercel.app";

function getPublicAppUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  return DEFAULT_PUBLIC_APP_URL;
}

function validateLoginForm(values: LoginFormState): LoginFormErrors {
  const errors: LoginFormErrors = {};

  if (!values.email.trim()) {
    errors.email = "Informe seu e-mail.";
  } else if (!EMAIL_REGEX.test(values.email)) {
    errors.email = "Informe um e-mail valido.";
  }

  if (!values.password.trim()) {
    errors.password = "Informe sua senha.";
  } else if (values.password.length < 6) {
    errors.password = "A senha deve ter pelo menos 6 caracteres.";
  }

  return errors;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isConfirmed = searchParams.get("confirmed") === "1";
  const authFlowError = searchParams.get("error");
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState<LoginFormState>(INITIAL_STATE);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDisabled = useMemo(
    () =>
      isSubmitting ||
      !form.email ||
      (mode !== "recover" && !form.password),
    [form.email, form.password, isSubmitting, mode],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors =
      mode === "recover"
        ? validateLoginForm({ email: form.email, password: "123456" })
        : validateLoginForm(form);

    if (mode === "recover") {
      delete validationErrors.password;
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();

      if (mode === "login") {
        const nextPath = searchParams.get("next");
        const safeNextPath = nextPath?.startsWith("/") ? nextPath : "/painel";

        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });

        if (error) {
          setErrors({ form: `Nao foi possivel entrar: ${error.message}` });
          return;
        }

        router.replace(safeNextPath);
        router.refresh();
        return;
      }

      if (mode === "signup") {
        const emailRedirectTo = `${getPublicAppUrl()}/auth/confirm?next=/login`;
        const { data, error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            emailRedirectTo,
          },
        });

        if (error) {
          setErrors({ form: `Nao foi possivel criar a conta: ${error.message}` });
          return;
        }

        if (data.session) {
          router.replace("/painel");
          router.refresh();
          return;
        }

        setSuccessMessage("Conta criada. Verifique seu e-mail para confirmar o cadastro.");
        return;
      }

      const redirectTo = `${getPublicAppUrl()}/auth/atualizar-senha`;
      const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim(), {
        redirectTo,
      });

      if (error) {
        setErrors({ form: `Nao foi possivel enviar o e-mail de recuperacao: ${error.message}` });
        return;
      }

      setSuccessMessage("Enviamos um link de recuperacao para o seu e-mail.");
    } catch (error) {
      setErrors({
        form:
          error instanceof Error
            ? `Nao foi possivel processar sua solicitacao: ${error.message}`
            : "Nao foi possivel processar sua solicitacao. Tente novamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function onFieldChange(field: keyof LoginFormState, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined, form: undefined }));
    setSuccessMessage(null);
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setShowPassword(false);
    setErrors({});
    setSuccessMessage(null);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-3 gap-2 rounded-lg bg-zinc-800/70 p-1">
        <button
          type="button"
          onClick={() => switchMode("login")}
          className={`h-9 rounded-md text-xs font-medium transition ${
            mode === "login" ? "bg-amber-400 text-zinc-950" : "text-zinc-200 hover:bg-zinc-700"
          }`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => switchMode("signup")}
          className={`h-9 rounded-md text-xs font-medium transition ${
            mode === "signup" ? "bg-amber-400 text-zinc-950" : "text-zinc-200 hover:bg-zinc-700"
          }`}
        >
          Cadastrar
        </button>
        <button
          type="button"
          onClick={() => switchMode("recover")}
          className={`h-9 rounded-md text-xs font-medium transition ${
            mode === "recover" ? "bg-amber-400 text-zinc-950" : "text-zinc-200 hover:bg-zinc-700"
          }`}
        >
          Recuperar
        </button>
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-zinc-200">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(event) => onFieldChange("email", event.target.value)}
          className="h-11 w-full rounded-lg border border-zinc-700/80 bg-zinc-950/80 px-3 text-sm text-zinc-100 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
          placeholder="voce@barbearia.com"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email ? (
          <p id="email-error" className="text-sm text-amber-300">
            {errors.email}
          </p>
        ) : null}
      </div>

      {mode !== "recover" ? (
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-zinc-200">
            Senha
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={form.password}
              onChange={(event) => onFieldChange("password", event.target.value)}
              className="h-11 w-full rounded-lg border border-zinc-700/80 bg-zinc-950/80 px-3 pr-24 text-sm text-zinc-100 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              placeholder="********"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
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
          {errors.password ? (
            <p id="password-error" className="text-sm text-amber-300">
              {errors.password}
            </p>
          ) : null}
        </div>
      ) : null}

      <Button
        type="submit"
        className="h-11 w-full bg-amber-400 text-zinc-950 hover:bg-amber-300"
        disabled={isDisabled}
      >
        {isSubmitting
          ? "Processando..."
          : mode === "login"
            ? "Entrar"
            : mode === "signup"
              ? "Criar conta"
              : "Enviar link de recuperacao"}
      </Button>

      {errors.form ? <p className="text-sm text-amber-300">{errors.form}</p> : null}
      {successMessage ? <p className="text-sm text-emerald-300">{successMessage}</p> : null}
      {!successMessage && isConfirmed ? (
        <p className="text-sm text-emerald-300">Conta confirmada com sucesso. Agora voce pode entrar.</p>
      ) : null}
      {!errors.form && authFlowError === "confirmacao_falhou" ? (
        <p className="text-sm text-amber-300">Nao foi possivel confirmar sua conta. Solicite um novo e-mail de confirmacao.</p>
      ) : null}

      <p className="text-center text-xs text-zinc-400">
        {mode === "login"
          ? "Use seu e-mail e senha para entrar."
          : mode === "signup"
            ? "Crie sua conta para acessar o sistema."
            : "Informe o e-mail para receber o link de recuperacao."}
      </p>
    </form>
  );
}
