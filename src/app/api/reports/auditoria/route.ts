import { toCsv } from "@/lib/reports/csv";
import { validateReportAccess } from "@/lib/reports/auth";
import { validateDateFilters, getAuditoriaReport } from "@/lib/reports/auditoria";

export async function GET(request: Request) {
  const accessResult = await validateReportAccess();

  if ("error" in accessResult) {
    return Response.json({ error: accessResult.error }, { status: accessResult.status });
  }

  const { context } = accessResult;
  const url = new URL(request.url);
  const filters = validateDateFilters(url);

  const reportResult = await getAuditoriaReport(context, filters);

  if ("error" in reportResult) {
    return Response.json({ error: reportResult.error }, { status: 500 });
  }

  const csv = toCsv(reportResult.columns, reportResult.rows);
  const fileName = `auditoria_${filters.from}_${filters.to}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
