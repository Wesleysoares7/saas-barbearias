import { redirect } from "next/navigation";
import { PageHeader } from "@/components/painel/ui/page-header";
import { Plus, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/painel/ui/form-dialog";
import { CreateEmployeeForm } from "@/components/painel/funcionarios/create-employee-form";
import { EmployeeItemForm } from "@/components/painel/funcionarios/employee-item-form";
import { RegisterMyselfAsEmployeeCard } from "@/components/painel/funcionarios/register-myself-as-employee-card";
import { canAccessModule, getAccessContext } from "@/lib/auth/access";
import { ListToolbar } from "@/components/painel/ui/list-toolbar";
import { Pagination, parsePageParam, sanitizeSearchTerm } from "@/components/painel/ui/pagination";
import { Panel } from "@/components/painel/ui/panel";
const PAGE_SIZE = 20;

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

export default async function FuncionariosPage({ searchParams }: { searchParams: Promise<{ q?: string; pagina?: string }> }) {
  const { supabase, companyId, userId, role, redirectTo } =
    await getAccessContext();

  if (!companyId || !role) {
    redirect(redirectTo ?? "/login");
  }

  if (!canAccessModule(role, "funcionarios")) {
    redirect("/painel");
  }

  const query = await searchParams;
  const term = sanitizeSearchTerm(query.q);
  const page = parsePageParam(query.pagina);
  const from = (page - 1) * PAGE_SIZE;

  let pagedQuery = supabase
    .from("employees")
    .select("id, nome, telefone, percentual_comissao, ativo, user_id, email", { count: "exact" })
    .eq("company_id", companyId);

  if (term) {
    pagedQuery = pagedQuery.or(`nome.ilike.%${term}%,telefone.ilike.%${term}%,email.ilike.%${term}%`);
  }

  const [{ data: employees }, { data: profile }, { data: company }, pagedResponse] =
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
      pagedQuery.order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1),
    ]);

  const pagedRows: EmployeeRow[] = (pagedResponse.data ?? []) as EmployeeRow[];
  const total = pagedResponse.count ?? 0;

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
      <PageHeader icon={UserRound} title="Funcionarios" description="Cadastre e mantenha a equipe da sua empresa."
        actions={
          <>
<FormDialog
            title="Novo Funcionario"
            contentClassName="max-w-2xl"
            trigger={
              <Button className="h-11 bg-amber-400 text-zinc-950 hover:bg-amber-300">
                <Plus className="size-4 mr-2" />
                Novo Funcionario
              </Button>
            }
          >
            <CreateEmployeeForm />
          </FormDialog>
          </>
        }
      />

      {isCurrentUserRegistered ? null : <RegisterMyselfAsEmployeeCard />}

      <Panel title="Lista de funcionarios" description={`${total} cadastrado(s)`}>
        <div className="space-y-3">
          <ListToolbar placeholder="Buscar por nome, telefone ou e-mail" defaultValue={term} />

          {pagedRows.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-muted-foreground">
              {term ? "Nenhum funcionario encontrado para essa busca." : "Nenhum funcionario cadastrado ainda."}
            </p>
          ) : (
            <div className="space-y-2">
              {pagedRows.map((employee) => (
                <EmployeeItemForm key={employee.id} employee={employee} />
              ))}
            </div>
          )}
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/painel/funcionarios" params={{ q: term }} />
      </Panel>
    </div>
  );
}