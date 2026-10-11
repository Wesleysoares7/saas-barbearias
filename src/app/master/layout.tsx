import { redirect } from "next/navigation";

import { MasterShell } from "@/components/master/master-shell";
import { getPlatformAccessContext } from "@/lib/auth/access";

export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  const { supabase, redirectTo, isPlatformAdmin } = await getPlatformAccessContext();

  if (redirectTo || !isPlatformAdmin) {
    redirect(redirectTo ?? "/painel");
  }

  const { data } = await supabase.auth.getUser();

  return <MasterShell userEmail={data.user?.email ?? "Usuario sem e-mail"}>{children}</MasterShell>;
}
