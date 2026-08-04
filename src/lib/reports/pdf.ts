import { PDFDocument, StandardFonts } from "pdf-lib";

type PdfTablePayload = {
  title: string;
  periodLabel: string;
  columns: string[];
  rows: Array<Array<string | number | null | undefined>>;
};

function normalizeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).replace(/\s+/g, " ").trim();
}

function formatRow(columns: string[], row: Array<string | number | null | undefined>): string {
  return columns
    .map((column, index) => {
      const value = normalizeCell(row[index]);
      const clipped = value.length > 40 ? `${value.slice(0, 37)}...` : value;
      return `${column}: ${clipped}`;
    })
    .join(" | ");
}

export async function generateReportPdf(payload: PdfTablePayload): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Courier);

  const pageWidth = 842;
  const pageHeight = 595;
  const marginX = 28;
  const marginTop = 24;
  const marginBottom = 24;
  const titleSize = 14;
  const metaSize = 10;
  const bodySize = 8;
  const bodyLineHeight = 12;

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - marginTop;

  const startNewPage = () => {
    page = pdf.addPage([pageWidth, pageHeight]);
    y = pageHeight - marginTop;
  };

  page.drawText(payload.title, { x: marginX, y, size: titleSize, font });
  y -= 18;
  page.drawText(`Periodo: ${payload.periodLabel}`, { x: marginX, y, size: metaSize, font });
  y -= 14;
  page.drawText(`Total de registros: ${payload.rows.length}`, { x: marginX, y, size: metaSize, font });
  y -= 18;

  if (payload.rows.length === 0) {
    page.drawText("Nenhum registro encontrado para o periodo informado.", {
      x: marginX,
      y,
      size: bodySize,
      font,
    });
    return pdf.save();
  }

  for (const row of payload.rows) {
    const line = formatRow(payload.columns, row);

    const chunks: string[] = [];
    const chunkSize = 150;
    for (let index = 0; index < line.length; index += chunkSize) {
      chunks.push(line.slice(index, index + chunkSize));
    }

    for (const chunk of chunks) {
      if (y < marginBottom + bodyLineHeight) {
        startNewPage();
      }

      page.drawText(chunk, {
        x: marginX,
        y,
        size: bodySize,
        font,
      });
      y -= bodyLineHeight;
    }

    y -= 2;
  }

  return pdf.save();
}
