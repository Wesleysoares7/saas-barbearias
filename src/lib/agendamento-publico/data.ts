import {
  BILLING_SELECT,
  resolveBillingState,
  type BillingRow,
} from "@/lib/billing/state";
import {
  addDaysToInput,
  endOfDayIso,
  isDateInputValue,
  startOfDayIso,
  todayInputValue,
} from "@/lib/datetime";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const LOGO_BUCKET = "company-logos";
const MAX_DATE_CHIPS = 21;

export type PublicCompany = {
  id: string;
  slug: string;
  nome: string;
  tema: string | null;
  logoUrl: string | null;
  intervalMin: number;
  leadMin: number;
  maxDays: number;
};

export type PublicService = {
  id: string;
  nome: string;
  duracao: number;
  valor: number;
};

export type PublicEmployee = {
  id: string;
  nome: string;
};

export type CompanyLookup =
  | { kind: "ok"; company: PublicCompany }
  | { kind: "not_found" }
  | { kind: "unavailable" };

type CompanyRow = BillingRow & {
  id: string;
  slug: string;
  nome: string;
  logo: string | null;
  tema: string | null;
  agendamento_online: boolean | null;
  agendamento_intervalo_min: number | null;
  agendamento_antecedencia_min: number | null;
  agendamento_dias_max: number | null;
};

export async function getPublicCompany(slug: string): Promise<CompanyLookup> {
  if (slug.length < 3 || slug.length > 40 || !SLUG_PATTERN.test(slug)) {
    return { kind: "not_found" };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("companies")
    .select(
      `id, slug, nome, logo, tema, agendamento_online, agendamento_intervalo_min, agendamento_antecedencia_min, agendamento_dias_max, ${BILLING_SELECT}`,
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("agendar: erro ao buscar empresa", error.code, error.message);
    return { kind: "unavailable" };
  }

  if (!data) {
    return { kind: "not_found" };
  }

  const row = data as unknown as CompanyRow;
  const billing = resolveBillingState(row);

  if (!row.agendamento_online || billing.blocked || billing.limited) {
    return { kind: "unavailable" };
  }

  const logoUrl = row.logo
    ? admin.storage.from(LOGO_BUCKET).getPublicUrl(row.logo).data.publicUrl
    : null;

  return {
    kind: "ok",
    company: {
      id: row.id,
      slug: row.slug,
      nome: row.nome,
      tema: row.tema,
      logoUrl,
      intervalMin: row.agendamento_intervalo_min ?? 30,
      leadMin: row.agendamento_antecedencia_min ?? 60,
      maxDays: row.agendamento_dias_max ?? 30,
    },
  };
}

export async function getPublicOptions(
  companyId: string,
): Promise<{ services: PublicService[]; employees: PublicEmployee[] }> {
  const admin = createSupabaseAdminClient();

  const [servicesResponse, employeesResponse, hoursResponse] =
    await Promise.all([
      admin
        .from("services")
        .select("id, nome, duracao, valor")
        .eq("company_id", companyId)
        .eq("ativo", true)
        .order("nome"),
      admin
        .from("employees")
        .select("id, nome")
        .eq("company_id", companyId)
        .eq("ativo", true)
        .order("nome"),
      admin
        .from("employee_work_hours")
        .select("employee_id")
        .eq("company_id", companyId),
    ]);

  if (servicesResponse.error || employeesResponse.error || hoursResponse.error) {
    console.error("agendar: erro ao buscar opcoes");
    return { services: [], employees: [] };
  }

  const withHours = new Set(
    ((hoursResponse.data ?? []) as { employee_id: string }[]).map(
      (row) => row.employee_id,
    ),
  );

  const services = ((servicesResponse.data ?? []) as PublicService[]).map(
    (service) => ({
      id: service.id,
      nome: service.nome,
      duracao: Number(service.duracao),
      valor: Number(service.valor),
    }),
  );

  const employees = ((employeesResponse.data ?? []) as PublicEmployee[])
    .filter((employee) => withHours.has(employee.id))
    .map((employee) => ({ id: employee.id, nome: employee.nome }));

  return { services, employees };
}

function isRealDate(date: string): boolean {
  const parsed = new Date(`${date}T12:00:00Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

function minuteToTime(minute: number): string {
  const hours = String(Math.floor(minute / 60)).padStart(2, "0");
  const minutes = String(minute % 60).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function minuteToMs(date: string, minute: number): number {
  return Date.parse(`${date}T${minuteToTime(minute)}:00-03:00`);
}

export function isValidDateChoice(
  company: PublicCompany,
  date: string,
  now: Date = new Date(),
): boolean {
  if (!isDateInputValue(date) || !isRealDate(date)) {
    return false;
  }

  const today = todayInputValue(now);

  return date >= today && date <= addDaysToInput(today, company.maxDays);
}

export async function getBookableDates(
  company: PublicCompany,
  employeeId: string,
  now: Date = new Date(),
): Promise<string[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("employee_work_hours")
    .select("weekday")
    .eq("company_id", company.id)
    .eq("employee_id", employeeId);

  if (error) {
    console.error("agendar: erro ao buscar dias", error.code, error.message);
    return [];
  }

  const weekdays = new Set(
    ((data ?? []) as { weekday: number }[]).map((row) => Number(row.weekday)),
  );
  const today = todayInputValue(now);
  const dates: string[] = [];

  for (let offset = 0; offset <= company.maxDays; offset += 1) {
    const date = addDaysToInput(today, offset);

    if (weekdays.has(weekdayOf(date))) {
      dates.push(date);
    }

    if (dates.length >= MAX_DATE_CHIPS) {
      break;
    }
  }

  return dates;
}

export async function getAvailableTimes(params: {
  company: PublicCompany;
  employeeId: string;
  durationMin: number;
  date: string;
  now?: Date;
}): Promise<string[]> {
  const { company, employeeId, durationMin, date } = params;
  const now = params.now ?? new Date();

  if (!isValidDateChoice(company, date, now) || durationMin <= 0) {
    return [];
  }

  const admin = createSupabaseAdminClient();

  const [hoursResponse, busyResponse] = await Promise.all([
    admin
      .from("employee_work_hours")
      .select("start_minute, end_minute")
      .eq("company_id", company.id)
      .eq("employee_id", employeeId)
      .eq("weekday", weekdayOf(date))
      .order("start_minute"),
    admin
      .from("appointments")
      .select("data_hora, data_hora_fim")
      .eq("company_id", company.id)
      .eq("employee_id", employeeId)
      .in("status", ["agendado", "aguardando"])
      .lt("data_hora", endOfDayIso(date))
      .gt("data_hora_fim", startOfDayIso(date)),
  ]);

  // Se qualquer consulta falhar, nao mostra nada (nunca "tudo livre" por engano).
  if (hoursResponse.error || busyResponse.error) {
    console.error("agendar: erro ao calcular horarios");
    return [];
  }

  const intervals = (hoursResponse.data ?? []) as {
    start_minute: number;
    end_minute: number;
  }[];

  const busy = (
    (busyResponse.data ?? []) as { data_hora: string; data_hora_fim: string }[]
  )
    .map((row) => ({
      start: Date.parse(row.data_hora),
      end: Date.parse(row.data_hora_fim),
    }))
    .filter((row) => Number.isFinite(row.start) && Number.isFinite(row.end));

  const earliest = now.getTime() + company.leadMin * 60000;
  const step = Math.max(company.intervalMin, 5);
  const times = new Set<string>();

  for (const interval of intervals) {
    for (
      let minute = interval.start_minute;
      minute + durationMin <= interval.end_minute;
      minute += step
    ) {
      const start = minuteToMs(date, minute);

      if (!Number.isFinite(start) || start < earliest) {
        continue;
      }

      const end = start + durationMin * 60000;
      const overlaps = busy.some((item) => start < item.end && end > item.start);

      if (!overlaps) {
        times.add(minuteToTime(minute));
      }
    }
  }

  return [...times].sort();
}