import { toCsv } from "@/lib/reports/csv";
import { validateReportAccess } from "@/lib/reports/auth";
import { getAppointmentsReport, validateDateFilters } from "@/lib/reports/appointments";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const range = validateDateFilters(url);

  const accessResult = await validateReportAccess();

  if ("error" in accessResult) {
    return Response.json({ error: accessResult.error }, { status: accessResult.status });
  }

  const { context } = accessResult;
  const reportResult = await getAppointmentsReport(context, range);

  if ("error" in reportResult) {
    return Response.json({ error: reportResult.error }, { status: 500 });
  }

  const csv = toCsv(reportResult.columns, reportResult.rows);
  const fileName = `relatorio_agendamentos_${range.labelStart}_${range.labelEnd}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
