import { getAccessContext } from "@/lib/auth/access";
import { endOfDayIso, isDateInputValue, monthStartInputValue, startOfDayIso, todayInputValue } from "@/lib/datetime";
import { generateReportPdf } from "@/lib/reports/pdf";

type AppointmentStatus = "agendado" | "concluido" | "cancelado";

type AppointmentRow = {
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

type EmployeeRow = {
  id: string;
  nome: string;
};

type ServiceRow = {
  id: string;
  nome: string;
};

function buildDateRange(url: URL) {
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const range = buildDateRange(url);

  const { supabase, userId, companyId } = await getAccessContext();

  if (!userId) {
    return Response.json({ error: "Nao autenticado." }, { status: 401 });
  }

  if (!companyId) {
    return Response.json({ error: "Empresa nao encontrada para este usuario." }, { status: 400 });
  }

  const { data: appointmentsData, error: appointmentsError } = await supabase
    .from("appointments")
    .select("id, cliente_nome, cliente_telefone, data_hora, data_hora_fim, status, observacoes, employee_id, service_id, created_at")
    .eq("company_id", companyId)
    .gte("data_hora", range.startIso)
    .lte("data_hora", range.endIso)
    .order("data_hora", { ascending: true });

  if (appointmentsError) {
    console.error("report_error", appointmentsError.code);
    return Response.json({ error: "Nao foi possivel gerar o relatorio." }, { status: 500 });
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
    return Response.json({ error: "Erro ao carregar referencias para o relatorio." }, { status: 500 });
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

  const pdfBytes = await generateReportPdf({
    title: "Relatorio de agendamentos",
    periodLabel: `${range.labelStart} a ${range.labelEnd}`,
    columns,
    rows,
  });
  const pdfArray = new Uint8Array(pdfBytes);
  const pdfBody = pdfArray.buffer.slice(pdfArray.byteOffset, pdfArray.byteOffset + pdfArray.byteLength);

  const fileName = `relatorio_agendamentos_${range.labelStart}_${range.labelEnd}.pdf`;

  return new Response(pdfBody, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
