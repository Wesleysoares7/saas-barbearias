"use client";

import { createBrowserClient } from "@supabase/ssr";

import { SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session-policy";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function createSupabaseBrowserClient() {
  const { supabaseAnonKey, supabaseUrl } = getSupabaseEnv();

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: { maxAge: SESSION_MAX_AGE_SECONDS },
  });
}
