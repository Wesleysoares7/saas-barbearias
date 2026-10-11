const NUMERIC_REGEX = /^-?\d+([.,]\d+)?$/;

export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "\"\"";
  }

  let raw = String(value);

  if (typeof value !== "number" && !NUMERIC_REGEX.test(raw) && /^[=+\-@\t\r]/.test(raw)) {
    raw = `'${raw}`;
  }

  const text = raw.replaceAll("\"", "\"\"");
  return `\"${text}\"`;
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const headerLine = headers.map((header) => csvCell(header)).join(",");
  const bodyLines = rows.map((row) => row.map((cell) => csvCell(cell)).join(","));
  return `\uFEFF${[headerLine, ...bodyLines].join("\n")}`;
}