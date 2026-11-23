import { Clock } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  WorkHoursForm,
  type WorkHourRow,
} from "@/components/painel/horarios/work-hours-form";
import { PageHeader } from "@/components/painel/ui/page-header";
import { Panel } from "@/components/painel/ui/panel";
import { canAccessModule, getAccessContext } from "@/lib/auth/access";

type EmployeeRow = { id: string; nome: string };
type HourRow = WorkHourRow & { employee_id: string };

export default async function HorariosPage() {
  const { supabase, companyId, role, redirectTo } = await getAccessContext();

  if (!companyId || !role) {
    redirect(redirectTo ?? "/login");
  }

  if (!canAccessModule(role, "funcionarios")) {
    redirect("/painel");
  }

  const [employeesResponse, hoursResponse] = await Promise.all([
    supabase
      .from("employees")
      .select("id, nome")
      .eq("company_id", companyId)
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("employee_work_hours")
      .select("employee_id, weekday, start_minute, end_minute")
      .eq("company_id", companyId)
      .order("start_minute"),
  ]);

  const employees = (employeesResponse.data ?? []) as EmployeeRow[];
  const hoursByEmployee = new Map<string, HourRow[]>();

  for (const row of (hoursResponse.data ?? []) as HourRow[]) {
    const list = hoursByEmployee.get(row.employee_id) ?? [];

    list.push(row);
    hoursByEmployee.set(row.employee_id, list);
  }

  return (
    <div className="space-y-4 pb-24">
      <PageHeader
        icon={Clock}
        title="Horarios de atendimento"
        description="Defina quando cada funcionario atende. Esses horarios aparecem para o cliente no agendamento online."
      />

      {hoursResponse.error ? (
        <p className="rounded-xl border border-amber-500/40 bg-amber-600/10 p-4 text-sm text-amber-200">
          Nao foi possivel carregar os horarios. Verifique se a migration 034
          foi executada no Supabase.
        </p>
      ) : null}

      <Panel
        title="Funcionarios"
        description="Toque no nome para editar. Dia sem horario fica fechado; para pausa de almoco, use dois intervalos."
      >
        {employees.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-muted-foreground">
            Nenhum funcionario ativo.{" "}
            <Link href="/painel/funcionarios" className="text-brand underline">
              Cadastre um funcionario
            </Link>{" "}
            para definir horarios.
          </p>
        ) : (
          <div className="space-y-2">
            {employees.map((employee) => (
              <WorkHoursForm
                key={employee.id}
                employeeId={employee.id}
                employeeName={employee.nome}
                rows={hoursByEmployee.get(employee.id) ?? []}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
