import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function GET() {
  try {
    const { supabaseAnonKey, supabaseUrl } = getSupabaseEnv();
    const normalizedSupabaseUrl = supabaseUrl.replace(/\/$/, "");

    const supabase = await createSupabaseServerClient();
    const authHealth = await supabase.auth.getSession();

    if (authHealth.error) {
      return NextResponse.json(
        {
          ok: false,
          mensagem: "Conexao com Supabase Auth falhou.",
          erro: authHealth.error.message,
        },
        { status: 500 },
      );
    }

    // O endpoint raiz do PostgREST pode responder 404 em alguns cenarios.
    // Isso nao significa necessariamente falta de conectividade.
    const restResponse = await fetch(`${normalizedSupabaseUrl}/rest/v1/`, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        Accept: "application/openapi+json",
      },
      cache: "no-store",
    });

    const postgrestReachable =
      restResponse.status === 200 ||
      restResponse.status === 401 ||
      restResponse.status === 403 ||
      restResponse.status === 404;

    if (!postgrestReachable) {
      return NextResponse.json(
        {
          ok: false,
          mensagem: "Conexao com API de banco (PostgREST) falhou.",
          status_http: restResponse.status,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      mensagem: "Conexao com Supabase validada com sucesso.",
      detalhes: {
        auth: "ok",
        postgrest: {
          status_http: restResponse.status,
          observacao:
            restResponse.status === 404
              ? "Endpoint raiz do PostgREST respondeu 404, mas o servico esta acessivel."
              : "Servico PostgREST acessivel.",
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        mensagem: "Erro inesperado ao testar conexao com Supabase.",
        erro: error instanceof Error ? error.message : "Erro desconhecido.",
      },
      { status: 500 },
    );
  }
}
