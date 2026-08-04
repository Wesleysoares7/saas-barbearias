import { NextResponse } from "next/server";

import { createSupabasePublicClient } from "@/lib/supabase/public";

type ServiceRow = {
  id: string;
  nome: string;
  duracao: number;
  valor: number;
};

type EmployeeRow = {
  id: string;
  nome: string;
};

type AppointmentRow = {
  employee_id: string;
  data_hora: string;
  data_hora_fim: string;
};

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const BRAZIL_OFFSET = "-03:00";

function buildDayRange(date: string): { startIso: string; endIso: string } | null {
  if (!DATE_REGEX.test(date)) {
    return null;
  }

  const start = new Date(`${date}T00:00:00${BRAZIL_OFFSET}`);
  const end = new Date(`${date}T23:59:59.999${BRAZIL_OFFSET}`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.trim().toLowerCase();

  if (!slug) {
    return NextResponse.json({ ok: false, message: "Slug da empresa invalido." }, { status: 400 });
  }

  const url = new URL(request.url);
  const date = url.searchParams.get("date")?.trim() ?? "";
  const dayRange = buildDayRange(date);

  if (!dayRange) {
    return NextResponse.json({ ok: false, message: "Parametro date invalido. Use YYYY-MM-DD." }, { status: 400 });
  }

  const supabase = createSupabasePublicClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id, nome, logo, public_slug")
    .eq("public_slug", slug)
    .maybeSingle();

  if (!company) {
    return NextResponse.json({ ok: false, message: "Empresa nao encontrada ou agendamento publico desativado." }, { status: 404 });
  }

  const [servicesResponse, employeesResponse, occupiedResponse] = await Promise.all([
    supabase
      .from("services")
      .select("id, nome, duracao, valor")
      .eq("company_id", company.id)
      .eq("ativo", true)
      .order("nome", { ascending: true }),
    supabase
      .from("employees")
      .select("id, nome")
      .eq("company_id", company.id)
      .eq("ativo", true)
      .order("nome", { ascending: true }),
    supabase
      .from("appointments")
      .select("employee_id, data_hora, data_hora_fim")
      .eq("company_id", company.id)
      .eq("status", "agendado")
      .gte("data_hora", dayRange.startIso)
      .lte("data_hora", dayRange.endIso)
      .order("data_hora", { ascending: true }),
  ]);

  if (servicesResponse.error || employeesResponse.error || occupiedResponse.error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Nao foi possivel carregar disponibilidade publica. Verifique se o script docs/database/008_etapa15_agendamento_publico.sql foi executado.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    company: {
      id: company.id,
      nome: company.nome,
      logo: company.logo,
      slug: company.public_slug,
    },
    availabilityConfig: {
      slotMinutes: 30,
      startHour: 9,
      endHour: 20,
    },
    services: (servicesResponse.data ?? []) as ServiceRow[],
    employees: (employeesResponse.data ?? []) as EmployeeRow[],
    occupiedSlots: (occupiedResponse.data ?? []) as AppointmentRow[],
  });
}
