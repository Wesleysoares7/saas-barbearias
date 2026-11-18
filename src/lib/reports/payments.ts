import { endOfDayIso, isDateInputValue, monthStartInputValue, startOfDayIso, todayInputValue } from "@/lib/datetime";
import { AuthContext } from "./auth";

export type PaymentRow = {
  id: string;
  appointment_id: string;
  valor: number;
  forma_pagamento: string;
  percentual_comissao: number;
  valor_comissao: number;
  created_at: string;
};

export type AppointmentRow = {
  id: string;
  cliente_nome: string;
  data_hora: string;
};

export type DateRange = {
  startIso: string;
  endIso: string;
  labelStart: string;
  labelEnd: string;
};

export type PaymentsReportData = {
  range: DateRange;
  payments: PaymentRow[];
  appointmentById: Map<string, AppointmentRow>;
  columns: string[];
  rows: (string | number)[][];
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

export async function getPaymentsReport(context: AuthContext, range: DateRange): Promise<{ error: string } | PaymentsReportData> {
  const { supabase, companyId } = context;

  const { data: paymentsData, error: paymentsError } = await supabase
    .from("payments")
    .select("id, appointment_id, valor, forma_pagamento, percentual_comissao, valor_comissao, created_at")
    .eq("company_id", companyId)
    .gte("created_at", range.startIso)
    .lte("created_at", range.endIso)
    .order("created_at", { ascending: true });

  if (paymentsError) {
    console.error("report_error", paymentsError.code);
    return { error: "Nao foi possivel gerar o relatorio." };
  }

  const payments = (paymentsData ?? []) as PaymentRow[];
  const appointmentIds = [...new Set(payments.map((item) => item.appointment_id).filter(Boolean))];

  const appointmentsResponse =
    appointmentIds.length > 0
      ? await supabase
          .from("appointments")
          .select("id, cliente_nome, data_hora")
          .eq("company_id", companyId)
          .in("id", appointmentIds)
      : { data: [] as AppointmentRow[], error: null };

  if (appointmentsResponse.error) {
    return { error: "Erro ao carregar dados de agendamento para o relatorio." };
  }

  const appointments = (appointmentsResponse.data ?? []) as AppointmentRow[];
  const appointmentById = new Map(appointments.map((appointment) => [appointment.id, appointment]));

  const columns = [
    "id",
    "appointment_id",
    "cliente_nome",
    "data_hora_agendamento",
    "valor",
    "forma_pagamento",
    "percentual_comissao",
    "valor_comissao",
    "created_at",
  ];

  const rows = payments.map((payment) => {
    const appointment = appointmentById.get(payment.appointment_id);

    return [
      payment.id,
      payment.appointment_id,
      appointment?.cliente_nome ?? "",
      appointment?.data_hora ?? "",
      payment.valor,
      payment.forma_pagamento,
      payment.percentual_comissao,
      payment.valor_comissao,
      payment.created_at,
    ];
  });

  return {
    range,
    payments,
    appointmentById,
    columns,
    rows,
  };
}
