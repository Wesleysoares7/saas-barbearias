export const APP_TIME_ZONE = "America/Sao_Paulo";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const PARTS_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function getParts(date: Date): Record<string, string> {
  const parts: Record<string, string> = {};

  for (const part of PARTS_FORMATTER.formatToParts(date)) {
    parts[part.type] = part.value;
  }

  return parts;
}

export function isDateInputValue(value: string | null | undefined): value is string {
  return typeof value === "string" && DATE_ONLY_PATTERN.test(value);
}

export function todayInputValue(now: Date = new Date()): string {
  const { year, month, day } = getParts(now);

  return `${year}-${month}-${day}`;
}

export function monthStartInputValue(now: Date = new Date()): string {
  return `${todayInputValue(now).slice(0, 8)}01`;
}

export function monthEndInputValue(now: Date = new Date()): string {
  const [year, month] = todayInputValue(now).split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return `${String(year)}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

export function addDaysToInput(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

export function startOfDayIso(date: string): string {
  return new Date(`${date}T00:00:00.000-03:00`).toISOString();
}

export function endOfDayIso(date: string): string {
  return new Date(`${date}T23:59:59.999-03:00`).toISOString();
}

export function localDateTimeToIso(value: string): string | null {
  if (!LOCAL_DATE_TIME_PATTERN.test(value)) {
    return null;
  }

  const date = new Date(`${value}:00-03:00`);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function isoToLocalInputValue(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const { year, month, day, hour, minute } = getParts(date);

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function isoToDateInputValue(iso: string): string {
  const date = new Date(iso);

  return Number.isNaN(date.getTime()) ? "" : todayInputValue(date);
}

export function dateInputToNoonIso(date: string): string | null {
  if (!DATE_ONLY_PATTERN.test(date)) {
    return null;
  }

  const parsed = new Date(`${date}T12:00:00-03:00`);

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function formatDateTimeBR(value: string | Date | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

export function formatDateBR(value: string | Date | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date =
    value instanceof Date
      ? value
      : new Date(DATE_ONLY_PATTERN.test(value) ? `${value}T12:00:00-03:00` : value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: APP_TIME_ZONE }).format(date);
}
