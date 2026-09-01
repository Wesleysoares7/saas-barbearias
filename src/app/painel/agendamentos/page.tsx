import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateAppointmentForm } from "@/components/painel/agendamentos/create-appointment-form";
import { AppointmentItemForm } from "@/components/painel/agendamentos/appointment-item-form";
import {
  canAccessModule,
  canPerformAction,
  getAccessContext,
} from "@/lib/auth/access";
import type { AppointmentStatus } from "@/types";

type OptionItem = {
  id: string;
  nome: string;
  duracao?: number;
  valor?: number;
  telefone?: string | null;
};

type AppointmentRow = {
  id: string;
  customer_id: string | null;
  cliente_nome: string;
  cliente_telefone: string | null;
  employee_id: string;
  service_id: string;
  data_hora: string;
  data_hora_fim: string | null;
  status: AppointmentStatus;
  observacoes: string | null;
};

type AppointmentSlot = {
  id: string;
  employeeId: string;
  startIso: string;
  endIso: string;
  status: AppointmentStatus;
};

export default async function AgendamentosPage() {
  const { supabase, companyId, role, redirectTo } = await getAccessContext();

  if (!companyId || !role) {
    redirect(redirectTo ?? "/login");
  }

  if (!canAccessModule(role, "agendamentos")) {
    redirect("/painel");
  }

  const canCreateAppointment = canPerformAction(role, "agendamentos", "create");
  const canUpdateAppointment = canPerformAction(role, "agendamentos", "update");
  const canDeleteAppointment = canPerformAction(role, "agendamentos", "delete");
  const canCompleteAndCharge = canPerformAction(role, "financeiro", "create");

  const [
    employeesResponse,
    servicesResponse,
    customersResponse,
    appointmentsResponse,
  ] = await Promise.all([
    supabase
      .from("employees")
      .select("id, nome")
      .eq("company_id", companyId)
      .eq("ativo", true)
      .order("nome", { ascending: true }),
    supabase
      .from("services")
      .select("id, nome, duracao, valor")
      .eq("company_id", companyId)
      .eq("ativo", true)
      .order("nome", { ascending: true }),
    supabase
      .from("customers")
      .select("id, nome, telefone")
      .eq("company_id", companyId)
      .eq("ativo", true)
      .order("nome", { ascending: true }),
    supabase
      .from("appointments")
      .select(
        "id, customer_id, cliente_nome, cliente_telefone, employee_id, service_id, data_hora, data_hora_fim, status, observacoes",
      )
      .eq("company_id", companyId)
      .order("data_hora", { ascending: true }),
  ]);

  const employees: OptionItem[] = (employeesResponse.data ??
    []) as OptionItem[];
  const services: OptionItem[] = (servicesResponse.data ?? []) as OptionItem[];
  const customers: OptionItem[] = (customersResponse.data ??
    []) as OptionItem[];
  const appointments: AppointmentRow[] = (appointmentsResponse.data ??
    []) as AppointmentRow[];
  const appointmentSlots: AppointmentSlot[] = appointments.map(
    (appointment) => ({
      id: appointment.id,
      employeeId: appointment.employee_id,
      startIso: appointment.data_hora,
      endIso: appointment.data_hora_fim ?? appointment.data_hora,
      status: appointment.status,
    }),
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Agendamentos</h1>
          <p className="text-sm text-zinc-300">
            Gerencie os agendamentos vinculados aos funcionarios e servicos da
            sua empresa.
          </p>
        </div>
        
        {canCreateAppointment && employees.length > 0 && services.length > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="h-11 bg-amber-400 text-zinc-950 hover:bg-amber-300">
                <Plus className="size-4 mr-2" />
                Novo Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Novo Agendamento</DialogTitle>
              </DialogHeader>
              <CreateAppointmentForm
                employees={employees}
                services={services}
                customers={customers}
                appointmentSlots={appointmentSlots}
              />
            </DialogContent>
          </Dialog>
        )}
      </header>

      {employees.length === 0 || services.length === 0 ? (
        <p className="rounded-xl border border-amber-500/40 bg-amber-600/10 p-4 text-sm text-amber-200">
          Para criar agendamentos, cadastre pelo menos um funcionario ativo e um
          servico ativo.
        </p>
      ) : !canCreateAppointment ? (
        <p className="rounded-xl border border-zinc-700/60 bg-zinc-950/60 p-4 text-sm text-zinc-300">
          Seu perfil pode visualizar e atualizar agendamentos, mas nao pode
          criar novos.
        </p>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-zinc-100">
            Lista de agendamentos
          </h2>
        </div>

        {appointments.length === 0 ? (
          <p className="rounded-xl border border-zinc-700/60 bg-zinc-950/60 p-4 text-sm text-zinc-300">
            Nenhum agendamento cadastrado ainda.
          </p>
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment) => (
              <AppointmentItemForm
                key={appointment.id}
                appointment={appointment}
                employees={employees}
                services={services}
                customers={customers}
                appointmentSlots={appointmentSlots}
                canUpdate={canUpdateAppointment}
                canDelete={canDeleteAppointment}
                canCompleteAndCharge={canCompleteAndCharge}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
