"use server";

import { headers } from "next/headers";

import {
  TIME_PATTERN,
  UUID_PATTERN,
  getAvailableTimes,
  getPublicCompany,
} from "@/lib/agendamento-publico/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type BookingState = {
  status: "idle" | "success" | "error" | "conflict";
  message: string;
};

const MAX_OPEN_PER_PHONE = 3;
const MAX_ONLINE_PER_HOUR = 20;
const GENERIC_ERROR = "Não foi possível enviar seu pedido. Tente novamente.";
const CONFLICT_MESSAGE =
  "Esse horário não está mais disponível. Escolha outro horário.";

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function formatPhone(value: string): string | null {
  let digits = value.replace(/\D/g, "");

  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }

  if (digits.length !== 10 && digits.length !== 11) {
    return null;
  }

  if (Number(digits.slice(0, 2)) < 11) {
    return null;
  }

  if (digits.length === 11 && digits[2] !== "9") {
    return null;
  }

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  const split = rest.length === 9 ? 5 : 4;

  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

async function verifyTurnstile(
  token: string,
  ip: string | null,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    // Falha segura em producao; em desenvolvimento libera para facilitar testes.
    return process.env.NODE_ENV !== "production";
  }

  if (!token) {
    return false;
  }

  try {
    const body = new URLSearchParams({ secret, response: token });

    if (ip) {
      body.set("remoteip", ip);
    }

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body, cache: "no-store" },
    );
    const result = (await response.json()) as { success?: boolean };

    return result.success === true;
  } catch {
    return false;
  }
}

export async function createPublicBookingAction(
  _prevState: BookingState,
  formData: FormData,
): Promise<BookingState> {
  // Campo isca: pessoas nao veem nem preenchem. Robos sim.
  if (readText(formData, "website") !== "") {
    return { status: "success", message: "Pedido enviado." };
  }

  const slug = readText(formData, "slug");
  const serviceId = readText(formData, "servico");
  const employeeId = readText(formData, "profissional");
  const date = readText(formData, "data");
  const time = readText(formData, "hora");
  const name = readText(formData, "nome").replace(/\s+/g, " ").slice(0, 80);
  const phone = formatPhone(readText(formData, "telefone"));
  const consent = formData.get("consent") === "on";

  if (
    !UUID_PATTERN.test(serviceId) ||
    !UUID_PATTERN.test(employeeId) ||
    !TIME_PATTERN.test(time) ||
    !date
  ) {
    return { status: "error", message: GENERIC_ERROR };
  }

  if (name.length < 2 || !/\p{L}/u.test(name) || /https?:\/\/|www\./i.test(name)) {
    return { status: "error", message: "Informe seu nome." };
  }

  if (!phone) {
    return { status: "error", message: "Informe um telefone válido com DDD." };
  }

  if (!consent) {
    return {
      status: "error",
      message: "Para continuar, aceite o envio dos seus dados para a barbearia.",
    };
  }

  const requestHeaders = await headers();
  const ip =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const human = await verifyTurnstile(
    readText(formData, "cf-turnstile-response"),
    ip,
  );

  if (!human) {
    return {
      status: "error",
      message:
        "Não foi possível validar a verificação de segurança. Aguarde o quadro de verificação e tente novamente.",
    };
  }

  const lookup = await getPublicCompany(slug);

  if (lookup.kind !== "ok") {
    return { status: "error", message: "Agendamento indisponível no momento." };
  }

  const { company } = lookup;
  const admin = createSupabaseAdminClient();

  const [serviceResponse, employeeResponse] = await Promise.all([
    admin
      .from("services")
      .select("id, duracao")
      .eq("id", serviceId)
      .eq("company_id", company.id)
      .eq("ativo", true)
      .maybeSingle(),
    admin
      .from("employees")
      .select("id")
      .eq("id", employeeId)
      .eq("company_id", company.id)
      .eq("ativo", true)
      .maybeSingle(),
  ]);

  if (!serviceResponse.data || !employeeResponse.data) {
    return { status: "error", message: GENERIC_ERROR };
  }

  const durationMin = Number((serviceResponse.data as { duracao: number }).duracao);

  // Recalcula os horarios livres agora: nao confia no que o navegador mostrou.
  const times = await getAvailableTimes({
    company,
    employeeId,
    durationMin,
    date,
  });

  if (!times.includes(time)) {
    return { status: "conflict", message: CONFLICT_MESSAGE };
  }

  const nowIso = new Date().toISOString();
  const hourAgoIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const [openResponse, recentResponse] = await Promise.all([
    admin
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id)
      .eq("origem", "online")
      .eq("cliente_telefone", phone)
      .in("status", ["aguardando", "agendado"])
      .gte("data_hora", nowIso),
    admin
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id)
      .eq("origem", "online")
      .gte("created_at", hourAgoIso),
  ]);

  if (openResponse.error || recentResponse.error) {
    console.error("agendar: erro ao checar limites");
    return { status: "error", message: GENERIC_ERROR };
  }

  if ((openResponse.count ?? 0) >= MAX_OPEN_PER_PHONE) {
    return {
      status: "error",
      message:
        "Você já tem pedidos em aberto. Aguarde a confirmação ou fale diretamente com a barbearia.",
    };
  }

  if ((recentResponse.count ?? 0) >= MAX_ONLINE_PER_HOUR) {
    return {
      status: "error",
      message: "Muitos pedidos no momento. Tente novamente mais tarde.",
    };
  }

  const startMs = Date.parse(`${date}T${time}:00-03:00`);

  if (!Number.isFinite(startMs)) {
    return { status: "error", message: GENERIC_ERROR };
  }

  const { error } = await admin.from("appointments").insert({
    company_id: company.id,
    cliente_nome: name,
    cliente_telefone: phone,
    employee_id: employeeId,
    service_id: serviceId,
    data_hora: new Date(startMs).toISOString(),
    data_hora_fim: new Date(startMs + durationMin * 60000).toISOString(),
    status: "aguardando",
    origem: "online",
  });

  if (error) {
    // 23P01 = exclusion_violation: alguem reservou o mesmo horario agora.
    if (error.code === "23P01") {
      return { status: "conflict", message: CONFLICT_MESSAGE };
    }

    console.error("agendar: erro ao criar pedido", error.code, error.message);

    return { status: "error", message: GENERIC_ERROR };
  }

  return {
    status: "success",
    message: "Pedido enviado! A barbearia vai confirmar o seu horário.",
  };
}