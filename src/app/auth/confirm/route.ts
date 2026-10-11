// Destino: src/app/auth/confirm/route.ts
// Aceita o link novo (?token_hash=...&type=...) e, por compatibilidade, o antigo (?code=...).
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const OTP_TYPES: readonly string[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

function isOtpType(value: string | null): value is EmailOtpType {
  return value !== null && OTP_TYPES.includes(value);
}

function getSafeNextPath(rawNext: string | null): string {
  if (!rawNext) {
    return "/login";
  }

  // Bloqueia "//site.com", "/\site.com" e qualquer barra invertida (open redirect).
  if (
    !rawNext.startsWith("/") ||
    rawNext.startsWith("//") ||
    rawNext.includes("\\")
  ) {
    return "/login";
  }

  return rawNext;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const safeNext = getSafeNextPath(searchParams.get("next"));

  const supabase = await createSupabaseServerClient();
  let failed = true;

  if (tokenHash && isOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (error) {
      console.error("auth_confirm_verify_otp", error.code);
    }

    failed = Boolean(error);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("auth_confirm_exchange_code", error.code);
    }

    failed = Boolean(error);
  }

  if (failed) {
    const failedUrl = new URL("/login", origin);
    failedUrl.searchParams.set("error", "confirmacao_falhou");
    return NextResponse.redirect(failedUrl);
  }

  const successUrl = new URL(safeNext, origin);

  if (type !== "recovery") {
    successUrl.searchParams.set("confirmed", "1");
  }

  return NextResponse.redirect(successUrl);
}
