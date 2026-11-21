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
  confirmPassword: string;
};

type LoginFormErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
};

const INITIAL_STATE: LoginFormState = {
  email: "",
  password: "",
  confirmPassword: "",
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

function validateLoginForm(
  values: LoginFormState,
  mode: AuthMode = "login",
): LoginFormErrors {
  const errors: LoginFormErrors = {};

  if (!values.email.trim()) {
    errors.email = "Informe seu e-mail.";
  } else if (!EMAIL_REGEX.test(values.email)) {
    errors.email = "Informe um e-mail válido.";
  }

  if (!values.password.trim()) {
    errors.password = "Informe sua senha.";
  } else if (mode === "signup" && values.password.length < 8) {
    errors.password = "A senha deve ter pelo menos 8 caracteres.";
  }

  if (mode === "signup") {
    if (!values.confirmPassword.trim()) {
      errors.confirmPassword = "Confirme sua senha.";
    } else if (values.confirmPassword !== values.password) {
      errors.confirmPassword = "As senhas não conferem.";
    }
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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      (mode !== "recover" && !form.password) ||
      (mode === "signup" && !form.confirmPassword),
    [form.email, form.password, form.confirmPassword, isBusy, mode],
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
        ? validateLoginForm({ email: form.email, password: "x", confirmPassword: "" }, "recover")
        : validateLoginForm(form, mode);

    if (mode === "recover") {
      delete validationErrors.password;
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (mode === "signup" && !acceptedTerms) {
      setErrors({
        form: "Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.",
      });
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
          setErrors({
            form: friendlyAuthError(
              error,
              "Não foi possível entrar. Tente novamente.",
            ),
          });
          return;
        }

        let destinationPath = safeNext ?? "/painel";

        if (!safeNext) {
          const { data: isPlatformAdmin } =
            await supabase.rpc("is_platform_admin");

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
            data: {
              terms_accepted_at: new Date().toISOString(),
              terms_version: "2026-10-11",
            },
          },
        });

        if (error) {
          setErrors({
            form: friendlyAuthError(
              error,
              "Não foi possível criar a conta. Tente novamente.",
            ),
          });
          return;
        }

        if (data.session) {
          setRedirecting(true);
          didRedirect = true;
          router.replace(signupNext === "/login" ? "/painel" : signupNext);
          router.refresh();
          return;
        }

        setSuccessMessage(
          "Conta criada. Verifique seu e-mail para confirmar o cadastro.",
        );
        return;
      }

      const redirectTo = `${getPublicAppUrl()}/auth/atualizar-senha`;
      const { error } = await supabase.auth.resetPasswordForEmail(
        form.email.trim(),
        {
          redirectTo,
        },
      );

      if (error) {
        setErrors({
          form: friendlyAuthError(
            error,
            "Não foi possível enviar o e-mail de recuperação. Tente novamente.",
          ),
        });
        return;
      }

      setSuccessMessage("Enviamos um link de recuperação para o seu e-mail.");
    } catch {
      setErrors({
        form: "Não foi possível processar sua solicitação. Tente novamente.",
      });
    } finally {
      if (!didRedirect) {
        setIsSubmitting(false);
      }
    }
  }

  function onFieldChange(field: keyof LoginFormState, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({
      ...previous,
      [field]: undefined,
      confirmPassword: ["password", "confirmPassword"].includes(field)
        ? undefined
        : previous.confirmPassword,
      form: undefined,
    }));
    setSuccessMessage(null);
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setForm((previous) => ({
      ...previous,
      confirmPassword: "",
    }));
    setAcceptedTerms(false);
    setErrors({});
    setSuccessMessage(null);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative space-y-4"
      noValidate
      aria-busy={isBusy}
    >
      {redirecting ? (
        <div
          role="status"
          className="absolute -inset-2 z-20 flex flex-col items-center justify-center gap-2 rounded-xl bg-background/70 backdrop-blur-[1px]"
        >
          <Spinner className="size-6 text-brand" />
          <p className="text-sm text-foreground">Entrando no sistema...</p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
        <button
          type="button"
          onClick={() => switchMode("login")}
          disabled={isBusy}
          className={`h-9 rounded-md text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
            mode === "login"
              ? "bg-brand text-brand-foreground"
              : "text-muted-foreground hover:bg-muted-foreground/10"
          }`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => switchMode("signup")}
          disabled={isBusy}
          className={`h-9 rounded-md text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
            mode === "signup"
              ? "bg-brand text-brand-foreground"
              : "text-muted-foreground hover:bg-muted-foreground/10"
          }`}
        >
          Cadastrar
        </button>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-foreground"
        >
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
          className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          placeholder="voce@seunegocio.com"
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
          <label
            htmlFor="password"
            className="block text-sm font-medium text-foreground"
          >
            Senha
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              value={form.password}
              onChange={(event) =>
                onFieldChange("password", event.target.value)
              }
              disabled={isBusy}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 pr-24 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              placeholder="********"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword((previous) => !previous)}
              disabled={isBusy}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium text-brand hover:text-brand/80"
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
        <div className="space-y-2">
          <label
            htmlFor="confirm-password"
            className="block text-sm font-medium text-foreground"
          >
            Confirmar senha
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(event) =>
                onFieldChange("confirmPassword", event.target.value)
              }
              disabled={isBusy}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 pr-24 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              placeholder="********"
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((previous) => !previous)}
              disabled={isBusy}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium text-brand hover:text-brand/80"
              aria-label={showConfirmPassword ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha"}
            >
              {showConfirmPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          {errors.confirmPassword ? (
            <p id="confirm-password-error" className="text-sm text-amber-300">
              {errors.confirmPassword}
            </p>
          ) : null}
        </div>
      ) : null}

      {mode === "login" ? (
        <div className="text-right">
          <button
            type="button"
            onClick={() => switchMode("recover")}
            disabled={isBusy}
            className="text-sm text-brand hover:text-brand/80 transition disabled:opacity-60"
          >
            Esqueci minha senha
          </button>
        </div>
      ) : null}

      {mode === "recover" ? (
        <div>
          <button
            type="button"
            onClick={() => switchMode("login")}
            disabled={isBusy}
            className="text-sm text-brand hover:text-brand/80 transition disabled:opacity-60"
          >
            Voltar para entrar
          </button>
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
            className="mt-1 size-4 shrink-0 accent-brand"
          />
          <label htmlFor="accept-terms" className="text-sm text-foreground">
            Li e concordo com os{" "}
            <Link
              href="/termos"
              target="_blank"
              className="text-brand underline hover:text-brand/80"
            >
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link
              href="/privacidade"
              target="_blank"
              className="text-brand underline hover:text-brand/80"
            >
              Política de Privacidade
            </Link>
            .
          </label>
        </div>
      ) : null}

      <Button
        type="submit"
        className="h-11 w-full bg-brand text-brand-foreground hover:bg-brand/90"
        disabled={isDisabled}
      >
        {isBusy ? (
          <>
            <Spinner />
            {mode === "login"
              ? "Entrando..."
              : mode === "signup"
                ? "Criando conta..."
                : "Enviando..."}
          </>
        ) : mode === "login" ? (
          "Entrar"
        ) : mode === "signup" ? (
          "Criar conta"
        ) : (
          "Enviar link de recuperação"
        )}
      </Button>

      {errors.form ? <p className="text-sm text-amber-300">{errors.form}</p> : null}
      {successMessage ? (
        <p className="text-sm text-emerald-300">{successMessage}</p>
      ) : null}
      {!successMessage && isConfirmed ? (
        <p className="text-sm text-emerald-300">
          Conta confirmada com sucesso. Agora você pode entrar.
        </p>
      ) : null}
      {!errors.form && authFlowError === "confirmacao_falhou" ? (
        <p className="text-sm text-amber-300">
          Não foi possível confirmar sua conta. Solicite um novo e-mail de confirmação.
        </p>
      ) : null}

      <p className="text-center text-xs text-muted-foreground">
        {mode === "login"
          ? "Use seu e-mail e senha para entrar."
          : mode === "signup"
            ? "Crie sua conta e comece a organizar sua agenda."
            : "Informe o e-mail para receber o link de recuperação."}
      </p>

      <div className="flex justify-center gap-4 text-xs text-muted-foreground">
        <Link href="/termos" className="hover:text-foreground">
          Termos de Uso
        </Link>
        <Link href="/privacidade" className="hover:text-foreground">
          Política de Privacidade
        </Link>
      </div>
    </form>
  );
}
