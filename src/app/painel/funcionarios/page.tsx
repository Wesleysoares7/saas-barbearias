import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateEmployeeForm } from "@/components/painel/funcionarios/create-employee-form";
import { EmployeeItemForm } from "@/components/painel/funcionarios/employee-item-form";
import { canAccessModule, getAccessContext } from "@/lib/auth/access";

type EmployeeRow = {
  id: string;
  nome: string;
  telefone: string | null;
  percentual_comissao: number;
  ativo: boolean;
};

export default async function FuncionariosPage() {
  const { supabase, companyId, role, redirectTo } = await getAccessContext();

  if (!companyId || !role) {
    redirect(redirectTo ?? "/login");
  }

  if (!canAccessModule(role, "funcionarios")) {
    redirect("/painel");
  }

  const { data: employees } = await supabase
    .from("employees")
    .select("id, nome, telefone, percentual_comissao, ativo")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  const employeeRows: EmployeeRow[] = (employees ?? []) as EmployeeRow[];

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.22),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(255,255,255,0.08),_transparent_40%)]" />

      <section className="relative z-10 mx-auto w-full max-w-5xl space-y-5 rounded-2xl border border-amber-400/20 bg-zinc-900/85 p-6 shadow-2xl backdrop-blur sm:p-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">Funcionarios</h1>
            <p className="text-sm text-zinc-300">Cadastre e mantenha a equipe da sua empresa.</p>
          </div>

          <Link href="/painel" className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200 transition hover:border-amber-400 hover:text-amber-300">
            Voltar ao painel
          </Link>
        </header>

        <CreateEmployeeForm />

        <div className="space-y-3">
          <h2 className="text-lg font-medium text-zinc-100">Lista de funcionarios</h2>

          {employeeRows.length === 0 ? (
            <p className="rounded-xl border border-zinc-700/60 bg-zinc-950/60 p-4 text-sm text-zinc-300">
              Nenhum funcionario cadastrado ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {employeeRows.map((employee) => (
                <EmployeeItemForm key={employee.id} employee={employee} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
