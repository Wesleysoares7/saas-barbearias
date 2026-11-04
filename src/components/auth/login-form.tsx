"use client";

import { friendlyAuthError } from "@/lib/errors";
import { safeNextPath } from "@/lib/safe-redirect";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
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

function validateLoginForm(values: LoginFormState, mode: AuthMode = "login"): LoginFormErrors {
  const errors: LoginFormErrors = {};

  if (!values.email.trim()) {
    errors.email = "Informe seu e-mail.";
  } else if (!EMAIL_REGEX.test(values.email)) {
    errors.email = "Informe um e-mail valido.";
  }

  if (!values.password.trim()) {
    errors.password = "Informe sua senha.";
  } else if (mode === "signup" && values.password.length < 8) {
    errors.password = "A senha deve ter pelo menos 8 caracteres.";
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const isBusy = isSubmitting || redirecting;

  const isDisabled = useMemo(
    () =>
      isBusy ||
      !form.email ||
      (mode !== "recover" && !form.password),
    [form.email, form.password, isBusy, mode],
  );

  useEffect(() => {
    if (!redirecting) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRedirecting(false);
      setIsSubmitting(false);
      setErrors({ form: "Demorou mais que o esperado. Tente novamente." });
    }, 15000);

    return () => window.clearTimeout(timeoutId);
  }, [redirecting]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors =
      mode === "recover"
        ? validateLoginForm({ email: form.email, password: "x" }, "recover")
        : validateLoginForm(form, mode);

    if (mode === "recover") {
      delete validationErrors.password;
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (mode === "signup" && !acceptedTerms) {
      setErrors({ form: "Para criar a conta, aceite os Termos de Uso e a Política de Privacidade." });
      return;
    }

    setErrors({});
    setSuccessMessage(null);
    setIsSubmitting(true);
    let didRedirect = false;

    try {
      const supabase = createSupabaseBrowserClient();

      if (mode === "login") {
        const nextPath = searchParams.get("next");
        const safeNext = safeNextPath(nextPath, "") || null;

        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });

        if (error) {
          setErrors({ form: friendlyAuthError(error, "Nao foi possivel entrar. Tente novamente.") });
          return;
        }

        let destinationPath = safeNext ?? "/painel";

        if (!safeNext) {
          const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");

          if (isPlatformAdmin) {
            destinationPath = "/master/empresas";
          }
        }

        setRedirecting(true);
        didRedirect = true;
        router.replace(destinationPath);
        router.refresh();
        return;
      }

      if (mode === "signup") {
        const signupNext = safeNextPath(searchParams.get("next"), "/login");
        const emailRedirectTo = `${getPublicAppUrl()}/auth/confirm?next=${encodeURIComponent(signupNext)}`;
        const { data, error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            emailRedirectTo,
            data: { terms_accepted_at: new Date().toISOString(), terms_version: "2026-10-11" },
          },
        });

        if (error) {
          setErrors({ form: friendlyAuthError(error, "Nao foi possivel criar a conta. Tente novamente.") });
          return;
        }

        if (data.session) {
          setRedirecting(true);
          didRedirect = true;
          router.replace(signupNext ===  "/login" ? "/painel" : signupNext);
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
        setErrors({ form: friendlyAuthError(error, "Nao foi possivel enviar o e-mail de recuperacao. Tente novamente.") });
        return;
      }

      setSuccessMessage("Enviamos um link de recuperacao para o seu e-mail.");
    } catch {
      setErrors({
        form: "Nao foi possivel processar sua solicitacao. Tente novamente.",
      });
    } finally {
      if (!didRedirect) {
        setIsSubmitting(false);
      }
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
    setAcceptedTerms(false);
    setErrors({});
    setSuccessMessage(null);
  }

  return (
    <form onSubmit={handleSubmit} className="relative space-y-4" noValidate aria-busy={isBusy}>
      {redirecting ? (
        <div
          role="status"
          className="absolute -inset-2 z-20 flex flex-col items-center justify-center gap-2 rounded-xl bg-zinc-950/70 backdrop-blur-[1px]"
        >
          <Spinner className="size-6 text-amber-400" />
          <p className="text-sm text-zinc-100">Entrando no sistema...</p>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2 rounded-lg bg-zinc-800/70 p-1">
        <button
          type="button"
          onClick={() => switchMode("login")}
          disabled={isBusy}
          className={`h-9 rounded-md text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
            mode === "login" ? "bg-amber-400 text-zinc-950" : "text-zinc-200 hover:bg-zinc-700"
          }`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => switchMode("signup")}
          disabled={isBusy}
          className={`h-9 rounded-md text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
            mode === "signup" ? "bg-amber-400 text-zinc-950" : "text-zinc-200 hover:bg-zinc-700"
          }`}
        >
          Cadastrar
        </button>
        <button
          type="button"
          onClick={() => switchMode("recover")}
          disabled={isBusy}
          className={`h-9 rounded-md text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
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
          disabled={isBusy}
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
              disabled={isBusy}
              className="h-11 w-full rounded-lg border border-zinc-700/80 bg-zinc-950/80 px-3 pr-24 text-sm text-zinc-100 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              placeholder="********"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword((previous) => !previous)}
              disabled={isBusy}
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

      {mode === "signup" ? (
        <div className="flex items-start gap-2">
          <input
            id="accept-terms"
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            disabled={isBusy}
            className="mt-1 size-4 shrink-0 accent-amber-400"
          />
          <label htmlFor="accept-terms" className="text-sm text-zinc-300">
            Li e concordo com os{" "}
            <Link href="/termos" target="_blank" className="text-amber-300 underline hover:text-amber-200">
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link href="/privacidade" target="_blank" className="text-amber-300 underline hover:text-amber-200">
              Política de Privacidade
            </Link>
            .
          </label>
        </div>
      ) : null}

      <Button
        type="submit"
        className="h-11 w-full bg-amber-400 text-zinc-950 hover:bg-amber-300"
        disabled={isDisabled}
      >
        {isBusy ? (
          <>
            <Spinner />
            {mode === "login" ? "Entrando..." : mode === "signup" ? "Criando conta..." : "Enviando..."}
          </>
        ) : mode === "login" ? (
          "Entrar"
        ) : mode === "signup" ? (
          "Criar conta"
        ) : (
          "Enviar link de recuperacao"
        )}
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

      <div className="flex justify-center gap-4 text-xs text-zinc-400">
        <Link href="/termos" className="hover:text-zinc-200">
          Termos de Uso
        </Link>
        <Link href="/privacidade" className="hover:text-zinc-200">
          Política de Privacidade
        </Link>
      </div>
    </form>
  );
}
