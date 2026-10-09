"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

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
        const safeNextPath = nextPath?.startsWith("/") ? nextPath : null;

        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });

        if (error) {
          setErrors({ form: `Nao foi possivel entrar: ${error.message}` });
          return;
        }

        let destinationPath = safeNextPath ?? "/painel";

        if (!safeNextPath) {
          const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");

          if (isPlatformAdmin) {
            destinationPath = "/master/empresas";
          }
        }

        router.replace(destinationPath);
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
      <div className="grid grid-cols-3 gap-2 rounded-lg bg-surface-2 p-1">
        <button
          type="button"
          onClick={() => switchMode("login")}
          className={`min-h-11 rounded-md text-sm font-medium transition ${
            mode === "login" ? "bg-brand text-brand-foreground" : "text-foreground hover:bg-surface"
          }`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => switchMode("signup")}
          className={`min-h-11 rounded-md text-sm font-medium transition ${
            mode === "signup" ? "bg-brand text-brand-foreground" : "text-foreground hover:bg-surface"
          }`}
        >
          Cadastrar
        </button>
        <button
          type="button"
          onClick={() => switchMode("recover")}
          className={`min-h-11 rounded-md text-sm font-medium transition ${
            mode === "recover" ? "bg-brand text-brand-foreground" : "text-foreground hover:bg-surface"
          }`}
        >
          Recuperar
        </button>
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-foreground">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(event) => onFieldChange("email", event.target.value)}
          className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          placeholder="voce@barbearia.com"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email ? (
          <p id="email-error" className="text-sm text-destructive">
            {errors.email}
          </p>
        ) : null}
      </div>

      {mode !== "recover" ? (
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-foreground">
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
              className="h-11 w-full rounded-lg border border-border bg-surface px-3 pr-24 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              placeholder={mode === "signup" ? "Crie uma senha" : "Sua senha"}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword((previous) => !previous)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium text-brand hover:opacity-80"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          {errors.password ? (
            <p id="password-error" className="text-sm text-destructive">
              {errors.password}
            </p>
          ) : null}
          {mode === "login" ? (
            <button
              type="button"
              onClick={() => switchMode("recover")}
              className="inline-flex min-h-11 items-center text-xs text-brand hover:underline"
            >
              Esqueci minha senha
            </button>
          ) : null}
        </div>
      ) : null}

      <Button
        type="submit"
        className="h-11 w-full bg-brand text-brand-foreground hover:bg-brand/90 disabled:opacity-60"
        disabled={isSubmitting}
      >
        {isSubmitting
          ? "Processando..."
          : mode === "login"
            ? "Entrar"
            : mode === "signup"
              ? "Criar conta"
              : "Enviar link de recuperacao"}
      </Button>

      {mode === "signup" ? (
        <p className="text-center text-xs text-muted-foreground">
          Ao criar a conta, voce aceita os{" "}
          <Link href="/termos" target="_blank" rel="noopener noreferrer" className="text-brand underline">
            Termos de uso
          </Link>{" "}
          e a{" "}
          <Link href="/privacidade" target="_blank" rel="noopener noreferrer" className="text-brand underline">
            Politica de privacidade
          </Link>
          .
        </p>
      ) : null}

      {errors.form ? <p className="text-sm text-destructive">{errors.form}</p> : null}
      {successMessage ? <p className="text-sm text-emerald-300">{successMessage}</p> : null}
      {!successMessage && isConfirmed ? (
        <p className="text-sm text-emerald-300">Conta confirmada com sucesso. Agora voce pode entrar.</p>
      ) : null}
      {!errors.form && authFlowError === "confirmacao_falhou" ? (
        <p className="text-sm text-destructive">Nao foi possivel confirmar sua conta. Solicite um novo e-mail de confirmacao.</p>
      ) : null}

      <p className="text-center text-xs text-muted-foreground">
        {mode === "login"
          ? "Use seu e-mail e senha para entrar."
          : mode === "signup"
            ? "Crie sua conta para acessar o sistema."
            : "Informe o e-mail para receber o link de recuperacao."}
      </p>
    </form>
  );
}
