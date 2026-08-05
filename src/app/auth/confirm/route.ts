import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function getSafeNextPath(rawNext: string | null) {
  if (!rawNext) {
    return "/login";
  }

  return rawNext.startsWith("/") ? rawNext : "/login";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const safeNext = getSafeNextPath(requestUrl.searchParams.get("next"));
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
