import { redirect } from "next/navigation";
import { PageHeader } from "@/components/painel/ui/page-header";
import { Plus, Scissors } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateServiceForm } from "@/components/painel/servicos/create-service-form";
import { ServiceItemForm } from "@/components/painel/servicos/service-item-form";
import { canAccessModule, getAccessContext } from "@/lib/auth/access";

type ServiceRow = {
  id: string;
  nome: string;
  duracao: number;
  valor: number;
  ativo: boolean;
};

export default async function ServicosPage() {
  const { supabase, companyId, role, redirectTo } = await getAccessContext();

  if (!companyId || !role) {
    redirect(redirectTo ?? "/login");
  }

  if (!canAccessModule(role, "servicos")) {
    redirect("/painel");
  }

  const { data: services } = await supabase
    .from("services")
    .select("id, nome, duracao, valor, ativo")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  const serviceRows: ServiceRow[] = (services ?? []) as ServiceRow[];

  return (
    <div className="space-y-5">
      <PageHeader icon={Scissors} title="Servicos" description="Cadastre e mantenha os servicos oferecidos pela sua empresa."
        actions={
          <>
<Dialog>
          <DialogTrigger asChild>
            <Button className="h-11 bg-amber-400 text-zinc-950 hover:bg-amber-300">
              <Plus className="size-4 mr-2" />
              Novo Servico
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Novo Servico</DialogTitle>
            </DialogHeader>
            <CreateServiceForm />
          </DialogContent>
        </Dialog>
          </>
        }
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-zinc-100">Lista de servicos</h2>
        </div>

        {serviceRows.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-zinc-300">
            Nenhum servico cadastrado ainda.
          </p>
        ) : (
          <div className="space-y-3">
            {serviceRows.map((service) => (
              <ServiceItemForm key={service.id} service={service} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
