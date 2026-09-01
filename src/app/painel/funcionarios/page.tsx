import { redirect } from "next/navigation";

import { CreateEmployeeForm } from "@/components/painel/funcionarios/create-employee-form";
import { EmployeeItemForm } from "@/components/painel/funcionarios/employee-item-form";
import { RegisterMyselfAsEmployeeCard } from "@/components/painel/funcionarios/register-myself-as-employee-card";
import { canAccessModule, getAccessContext } from "@/lib/auth/access";

type EmployeeRow = {
  id: string;
  nome: string;
  telefone: string | null;
  percentual_comissao: number | null;
  ativo: boolean;
  user_id: string | null;
  email: string | null;
};

export default async function FuncionariosPage() {
  const { supabase, companyId, userId, role, redirectTo } = await getAccessContext();

  if (!companyId || !role) {
    redirect(redirectTo ?? "/login");
  }

  if (!canAccessModule(role, "funcionarios")) {
    redirect("/painel");
  }

  const { data: employees } = await supabase
    .from("employees")
    .select("id, nome, telefone, percentual_comissao, ativo, user_id, email")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  const employeeRows: EmployeeRow[] = (employees ?? []) as EmployeeRow[];
  const isCurrentUserRegistered = employeeRows.some((employee) => employee.user_id === userId);

  return (
    <div className="space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">Funcionarios</h1>
            <p className="text-sm text-zinc-300">Cadastre e mantenha a equipe da sua empresa.</p>
          </div>
        </header>

        {isCurrentUserRegistered ? null : <RegisterMyselfAsEmployeeCard />}

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
    </div>
  );
}
