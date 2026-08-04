import { NextResponse } from "next/server";

import { calculateEndDateIso } from "@/lib/appointments/conflict";
import { createSupabasePublicClient } from "@/lib/supabase/public";

type BookingPayload = {
  customerName?: string;
  customerPhone?: string;
  serviceId?: string;
  employeeId?: string;
  startAt?: string;
  notes?: string;
  website?: string;
};

type RateLimitState = {
  count: number;
  windowStart: number;
  lastAttempt: number;
};

const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MIN_INTERVAL_MS = 3 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 12;

const attemptByIp = new Map<string, RateLimitState>();

function sanitizeText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const current = attemptByIp.get(ip);

  if (!current) {
    attemptByIp.set(ip, { count: 1, windowStart: now, lastAttempt: now });
    return true;
  }

  if (now - current.lastAttempt < MIN_INTERVAL_MS) {
    return false;
  }

  if (now - current.windowStart > ATTEMPT_WINDOW_MS) {
    attemptByIp.set(ip, { count: 1, windowStart: now, lastAttempt: now });
    return true;
  }

  if (current.count >= MAX_ATTEMPTS_PER_WINDOW) {
    return false;
  }

  current.count += 1;
  current.lastAttempt = now;
  attemptByIp.set(ip, current);
  return true;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const ip = getClientIp(request);

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.",
      },
      { status: 429 },
    );
  }

  const { slug: rawSlug } = await params;
  const slug = rawSlug.trim().toLowerCase();

  if (!slug) {
    return NextResponse.json({ ok: false, message: "Slug da empresa invalido." }, { status: 400 });
  }

  let payload: BookingPayload;

  try {
    payload = (await request.json()) as BookingPayload;
  } catch {
    return NextResponse.json({ ok: false, message: "Corpo da requisicao invalido." }, { status: 400 });
  }

  // Honeypot simples para reduzir spam automatizado.
  if (sanitizeText(payload.website)) {
    return NextResponse.json({ ok: true, message: "Solicitacao recebida." });
  }

  const customerName = sanitizeText(payload.customerName);
  const customerPhone = sanitizeText(payload.customerPhone);
  const serviceId = sanitizeText(payload.serviceId);
  const employeeId = sanitizeText(payload.employeeId);
  const startAt = sanitizeText(payload.startAt);
  const notes = sanitizeText(payload.notes);

  if (customerName.length < 2) {
    return NextResponse.json({ ok: false, message: "Informe seu nome com pelo menos 2 caracteres." }, { status: 400 });
  }

  if (customerPhone.length < 8) {
    return NextResponse.json({ ok: false, message: "Informe um telefone valido para confirmacao." }, { status: 400 });
  }

  if (!serviceId || !employeeId || !startAt) {
    return NextResponse.json({ ok: false, message: "Selecione servico, profissional e horario." }, { status: 400 });
  }

  const startDate = new Date(startAt);

  if (Number.isNaN(startDate.getTime())) {
    return NextResponse.json({ ok: false, message: "Horario invalido." }, { status: 400 });
  }

  const now = Date.now();

  if (startDate.getTime() <= now + 2 * 60 * 1000) {
    return NextResponse.json({ ok: false, message: "Escolha um horario futuro." }, { status: 400 });
  }

  const supabase = createSupabasePublicClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("public_slug", slug)
    .maybeSingle();

  if (!company) {
    return NextResponse.json({ ok: false, message: "Empresa nao encontrada ou canal publico desativado." }, { status: 404 });
  }

  const [employeeResponse, serviceResponse] = await Promise.all([
    supabase
      .from("employees")
      .select("id")
      .eq("id", employeeId)
      .eq("company_id", company.id)
      .eq("ativo", true)
      .maybeSingle(),
    supabase
      .from("services")
      .select("id, duracao")
      .eq("id", serviceId)
      .eq("company_id", company.id)
      .eq("ativo", true)
      .maybeSingle(),
  ]);

  if (!employeeResponse.data || !serviceResponse.data) {
    return NextResponse.json({ ok: false, message: "Servico ou profissional indisponivel." }, { status: 400 });
  }

  const durationMinutes = Number(serviceResponse.data.duracao);

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return NextResponse.json({ ok: false, message: "Duracao de servico invalida." }, { status: 400 });
  }

  const dataHora = startDate.toISOString();
  const dataHoraFim = calculateEndDateIso(dataHora, Math.trunc(durationMinutes));

  const { error: insertError } = await supabase.from("appointments").insert({
    company_id: company.id,
    customer_id: null,
    cliente_nome: customerName,
    cliente_telefone: customerPhone,
    employee_id: employeeId,
    service_id: serviceId,
    data_hora: dataHora,
    data_hora_fim: dataHoraFim,
    status: "agendado",
    observacoes: notes || null,
  });

  if (insertError) {
    if (insertError.message.includes("appointments_no_overlap_per_employee")) {
      return NextResponse.json({ ok: false, message: "Horario indisponivel. Escolha outro horario." }, { status: 409 });
    }

    if (insertError.message.includes("row-level security") || insertError.message.includes("public_slug")) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Canal publico ainda nao configurado no banco. Execute o script docs/database/008_etapa15_agendamento_publico.sql.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: false, message: `Nao foi possivel concluir o agendamento: ${insertError.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Agendamento enviado com sucesso. Aguarde confirmacao da barbearia." });
}
