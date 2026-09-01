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

function normalizePhone(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

// Correspondencia por multiplos criterios: user_id, e-mail, telefone (so numeros) ou nome
// identico ao do perfil do administrador. Cobre registros criados antes do vinculo por user_id
// existir (ex.: cadastro manual anterior a esta etapa).
function findMatchingEmployee(
  employees: EmployeeRow[],
  admin: { userId: string; email: string; nome: string; telefone: string },
): EmployeeRow | null {
  const normalizedEmail = normalizeText(admin.email);
  const normalizedPhone = normalizePhone(admin.telefone);
  const normalizedNome = normalizeText(admin.nome);

  return (
    employees.find((employee) => {
      if (employee.user_id === admin.userId) {
        return true;
      }

      if (
        normalizedEmail &&
        normalizeText(employee.email) === normalizedEmail
      ) {
        return true;
      }

      if (
        normalizedPhone &&
        normalizePhone(employee.telefone) === normalizedPhone
      ) {
        return true;
      }

      if (normalizedNome && normalizeText(employee.nome) === normalizedNome) {
        return true;
      }

      return false;
    }) ?? null
  );
}

export default async function FuncionariosPage() {
  const { supabase, companyId, userId, role, redirectTo } =
    await getAccessContext();

  if (!companyId || !role) {
    redirect(redirectTo ?? "/login");
  }

  if (!canAccessModule(role, "funcionarios")) {
    redirect("/painel");
  }

  const [{ data: employees }, { data: profile }, { data: company }] =
    await Promise.all([
      supabase
        .from("employees")
        .select(
          "id, nome, telefone, percentual_comissao, ativo, user_id, email",
        )
        .eq("company_id", companyId)
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("nome, email")
        .eq("id", userId)
        .eq("company_id", companyId)
        .maybeSingle(),
      supabase
        .from("companies")
        .select("telefone")
        .eq("id", companyId)
        .maybeSingle(),
    ]);

  const employeeRows: EmployeeRow[] = (employees ?? []) as EmployeeRow[];
  const matchedEmployee =
    userId && profile
      ? findMatchingEmployee(employeeRows, {
          userId,
          email: profile.email ?? "",
          nome: profile.nome ?? "",
          telefone: company?.telefone ?? "",
        })
      : null;

  if (matchedEmployee && !matchedEmployee.user_id && userId) {
    await supabase
      .from("employees")
      .update({ user_id: userId })
      .eq("id", matchedEmployee.id)
      .eq("company_id", companyId);
  }

  const isCurrentUserRegistered = Boolean(matchedEmployee);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Funcionarios</h1>
          <p className="text-sm text-zinc-300">
            Cadastre e mantenha a equipe da sua empresa.
          </p>
        </div>
      </header>

      {isCurrentUserRegistered ? null : <RegisterMyselfAsEmployeeCard />}

      <CreateEmployeeForm />

      <div className="space-y-3">
        <h2 className="text-lg font-medium text-zinc-100">
          Lista de funcionarios
        </h2>

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
