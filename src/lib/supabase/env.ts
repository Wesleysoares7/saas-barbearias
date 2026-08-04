type SupabaseEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export function getSupabaseEnv(): SupabaseEnv {
  const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!rawSupabaseUrl) {
    throw new Error("Variavel de ambiente obrigatoria ausente: NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!supabaseAnonKey) {
    throw new Error("Variavel de ambiente obrigatoria ausente: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const normalizedSupabaseUrl = rawSupabaseUrl.replace(/\/$/, "");

  if (normalizedSupabaseUrl.endsWith("/rest/v1") || normalizedSupabaseUrl.endsWith("/auth/v1")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL invalida. Use apenas o dominio base do projeto (ex.: https://seu-projeto.supabase.co).",
    );
  }

  return {
    supabaseUrl: normalizedSupabaseUrl,
    supabaseAnonKey,
  };
}
