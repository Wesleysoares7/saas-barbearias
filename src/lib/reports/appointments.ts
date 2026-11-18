import { endOfDayIso, isDateInputValue, monthStartInputValue, startOfDayIso, todayInputValue } from "@/lib/datetime";
import { AuthContext } from "./auth";

export type AppointmentStatus = "agendado" | "concluido" | "cancelado";

export type AppointmentRow = {
  id: string;
  cliente_nome: string;
  cliente_telefone: string | null;
  data_hora: string;
  data_hora_fim: string | null;
  status: AppointmentStatus;
  observacoes: string | null;
  employee_id: string;
  service_id: string;
  created_at: string;
};

export type EmployeeRow = {
  id: string;
  nome: string;
};

export type ServiceRow = {
  id: string;
  nome: string;
};

export type DateRange = {
  startIso: string;
  endIso: string;
  labelStart: string;
  labelEnd: string;
};

export type AppointmentsReportData = {
  range: DateRange;
  appointments: AppointmentRow[];
  employeeNameById: Map<string, string>;
  serviceNameById: Map<string, string>;
  columns: string[];
  rows: (string | number | null)[][];
};

export function validateDateFilters(url: URL): DateRange {
  const startInput = url.searchParams.get("start");
  const endInput = url.searchParams.get("end");

  const labelStart = isDateInputValue(startInput) ? startInput : monthStartInputValue();
  const labelEnd = isDateInputValue(endInput) ? endInput : todayInputValue();

  return {
    startIso: startOfDayIso(labelStart),
    endIso: endOfDayIso(labelEnd),
    labelStart,
    labelEnd,
  };
}

export async function getAppointmentsReport(context: AuthContext, range: DateRange): Promise<{ error: string } | AppointmentsReportData> {
  const { supabase, companyId } = context;

  const { data: appointmentsData, error: appointmentsError } = await supabase
    .from("appointments")
    .select("id, cliente_nome, cliente_telefone, data_hora, data_hora_fim, status, observacoes, employee_id, service_id, created_at")
    .eq("company_id", companyId)
    .gte("data_hora", range.startIso)
    .lte("data_hora", range.endIso)
    .order("data_hora", { ascending: true });

  if (appointmentsError) {
    console.error("report_error", appointmentsError.code);
    return { error: "Nao foi possivel gerar o relatorio." };
  }

  const appointments = (appointmentsData ?? []) as AppointmentRow[];
  const employeeIds = [...new Set(appointments.map((item) => item.employee_id).filter(Boolean))];
  const serviceIds = [...new Set(appointments.map((item) => item.service_id).filter(Boolean))];

  const [employeesResponse, servicesResponse] = await Promise.all([
    employeeIds.length > 0
      ? supabase.from("employees").select("id, nome").eq("company_id", companyId).in("id", employeeIds)
      : Promise.resolve({ data: [] as EmployeeRow[], error: null }),
    serviceIds.length > 0
      ? supabase.from("services").select("id, nome").eq("company_id", companyId).in("id", serviceIds)
      : Promise.resolve({ data: [] as ServiceRow[], error: null }),
  ]);

  if (employeesResponse.error || servicesResponse.error) {
    return { error: "Erro ao carregar referencias para o relatorio." };
  }

  const employees = (employeesResponse.data ?? []) as EmployeeRow[];
  const services = (servicesResponse.data ?? []) as ServiceRow[];

  const employeeNameById = new Map(employees.map((employee) => [employee.id, employee.nome]));
  const serviceNameById = new Map(services.map((service) => [service.id, service.nome]));

  const columns = [
    "id",
    "cliente_nome",
    "cliente_telefone",
    "data_hora",
    "data_hora_fim",
    "status",
    "funcionario",
    "servico",
    "observacoes",
    "created_at",
  ];

  const rows = appointments.map((appointment) => [
    appointment.id,
    appointment.cliente_nome,
    appointment.cliente_telefone,
    appointment.data_hora,
    appointment.data_hora_fim,
    appointment.status,
    employeeNameById.get(appointment.employee_id) ?? "",
    serviceNameById.get(appointment.service_id) ?? "",
    appointment.observacoes,
    appointment.created_at,
  ]);

  return {
    range,
    appointments,
    employeeNameById,
    serviceNameById,
    columns,
    rows,
  };
}
