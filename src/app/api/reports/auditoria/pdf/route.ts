import { validateReportAccess } from "@/lib/reports/auth";
import { validateDateFilters, getAuditoriaReport } from "@/lib/reports/auditoria";
import { generateReportPdf } from "@/lib/reports/pdf";

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

  const pdfBytes = await generateReportPdf({
    title: "Relatorio de auditoria",
    periodLabel: `${filters.from} a ${filters.to}`,
    columns: reportResult.columns,
    rows: reportResult.rows,
  });

  const pdfArray = new Uint8Array(pdfBytes);
  const pdfBody = pdfArray.buffer.slice(pdfArray.byteOffset, pdfArray.byteOffset + pdfArray.byteLength);

  const fileName = `auditoria_${filters.from}_${filters.to}.pdf`;

  return new Response(pdfBody, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
