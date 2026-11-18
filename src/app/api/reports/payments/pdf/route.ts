import { validateReportAccess } from "@/lib/reports/auth";
import { validateDateFilters, getPaymentsReport } from "@/lib/reports/payments";
import { generateReportPdf } from "@/lib/reports/pdf";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const range = validateDateFilters(url);

  const accessResult = await validateReportAccess();
  if ("error" in accessResult) {
    return Response.json({ error: accessResult.error }, { status: accessResult.status });
  }

  const reportData = await getPaymentsReport(accessResult.context, range);
  if ("error" in reportData) {
    return Response.json({ error: reportData.error }, { status: 500 });
  }

  const pdfBytes = await generateReportPdf({
    title: "Relatorio financeiro",
    periodLabel: `${range.labelStart} a ${range.labelEnd}`,
    columns: reportData.columns,
    rows: reportData.rows,
  });
  const pdfArray = new Uint8Array(pdfBytes);
  const pdfBody = pdfArray.buffer.slice(pdfArray.byteOffset, pdfArray.byteOffset + pdfArray.byteLength);

  const fileName = `relatorio_financeiro_${range.labelStart}_${range.labelEnd}.pdf`;

  return new Response(pdfBody, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
