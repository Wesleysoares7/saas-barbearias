import { NextResponse } from "next/server";

import { safeNextPath } from "@/lib/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const safeNext = safeNextPath(requestUrl.searchParams.get("next"), "/login");
  const redirectUrl = new URL(safeNext, requestUrl.origin);

  if (!code) {
    redirectUrl.searchParams.set("error", "confirmacao_falhou");
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    redirectUrl.searchParams.set("error", "confirmacao_falhou");
    return NextResponse.redirect(redirectUrl);
  }

  redirectUrl.searchParams.set("confirmed", "1");
  return NextResponse.redirect(redirectUrl);
}
