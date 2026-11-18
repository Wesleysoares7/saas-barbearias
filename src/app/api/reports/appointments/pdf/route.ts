import { validateReportAccess } from "@/lib/reports/auth";
import { getAppointmentsReport, validateDateFilters } from "@/lib/reports/appointments";
import { generateReportPdf } from "@/lib/reports/pdf";

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

  const pdfBytes = await generateReportPdf({
    title: "Relatorio de agendamentos",
    periodLabel: `${range.labelStart} a ${range.labelEnd}`,
    columns: reportResult.columns,
    rows: reportResult.rows,
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
