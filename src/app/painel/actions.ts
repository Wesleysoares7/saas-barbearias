"use server";

import { redirect } from "next/navigation";

import { clearSupportCookie } from "@/lib/auth/support";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  await clearSupportCookie();
  redirect("/login");
}
