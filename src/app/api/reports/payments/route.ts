import { getAccessContext } from "@/lib/auth/access";
import { endOfDayIso, isDateInputValue, monthStartInputValue, startOfDayIso, todayInputValue } from "@/lib/datetime";

type PaymentRow = {
  id: string;
  appointment_id: string;
  valor: number;
  forma_pagamento: string;
  percentual_comissao: number;
  valor_comissao: number;
  created_at: string;
};

type AppointmentRow = {
  id: string;
  cliente_nome: string;
  data_hora: string;
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

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "\"\"";
  }

  const text = String(value).replaceAll("\"", "\"\"");
  return `\"${text}\"`;
}

function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const headerLine = headers.map((header) => csvCell(header)).join(",");
  const bodyLines = rows.map((row) => row.map((cell) => csvCell(cell)).join(","));
  return `\uFEFF${[headerLine, ...bodyLines].join("\n")}`;
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

  const { data: paymentsData, error: paymentsError } = await supabase
    .from("payments")
    .select("id, appointment_id, valor, forma_pagamento, percentual_comissao, valor_comissao, created_at")
    .eq("company_id", companyId)
    .gte("created_at", range.startIso)
    .lte("created_at", range.endIso)
    .order("created_at", { ascending: true });

  if (paymentsError) {
    return Response.json({ error: `Erro ao gerar relatorio: ${paymentsError.message}` }, { status: 500 });
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
    return Response.json({ error: "Erro ao carregar dados de agendamento para o relatorio." }, { status: 500 });
  }

  const appointments = (appointmentsResponse.data ?? []) as AppointmentRow[];
  const appointmentById = new Map(appointments.map((appointment) => [appointment.id, appointment]));

  const csv = toCsv(
    [
      "id",
      "appointment_id",
      "cliente_nome",
      "data_hora_agendamento",
      "valor",
      "forma_pagamento",
      "percentual_comissao",
      "valor_comissao",
      "created_at",
    ],
    payments.map((payment) => {
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
    }),
  );

  const fileName = `relatorio_financeiro_${range.labelStart}_${range.labelEnd}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
