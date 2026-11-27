"use server";

import { createHmac } from "node:crypto";

import { headers } from "next/headers";

import {
  BOOKING_CODE_PATTERN,
  normalizeBookingCode,
} from "@/lib/agendamento-publico/booking-code";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type LookupState = {
  status: "idle" | "error" | "found";
  message: string;
  token?: string;
  path?: string;
};

const WINDOW_MINUTES = 15;
const MAX_FAILS_PER_IP = 8;
const MAX_FAILS_PER_COMPANY = 40;
const NOT_FOUND_MESSAGE =
  "Não encontramos um pedido com esses dados. Confira o código e o telefone.";
const UNAVAILABLE_MESSAGE =
  "Consulta indisponível no momento. Tente novamente mais tarde.";

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function phoneDigits(value: string): string {
  let digits = value.replace(/\D/g, "");

  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }

  return digits;
}

// Guarda so um hash: o IP em si nunca e gravado.
function hashIp(ip: string | null): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "agendar-lookup";

  return createHmac("sha256", secret).update(ip ?? "unknown").digest("hex");
}

export async function lookupBookingAction(
  _prevState: LookupState,
  formData: FormData,
): Promise<LookupState> {
  const slug = readText(formData, "slug");
  const code = normalizeBookingCode(readText(formData, "codigo"));
  const phone = phoneDigits(readText(formData, "telefone"));

  if (
    !/^[a-z0-9-]{3,40}$/.test(slug) ||
    !BOOKING_CODE_PATTERN.test(code) ||
    phone.length < 10 ||
    phone.length > 11
  ) {
    return {
      status: "error",
      message:
        "Informe o código do pedido (6 caracteres) e o telefone usado no pedido.",
    };
  }

  const admin = createSupabaseAdminClient();

  const { data: company } = await admin
    .from("companies")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!company) {
    return { status: "error", message: NOT_FOUND_MESSAGE };
  }

  const companyId = (company as { id: string }).id;
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ipHash = hashIp(ip);

  const since = new Date();

  since.setMinutes(since.getMinutes() - WINDOW_MINUTES);

  const old = new Date();

  old.setDate(old.getDate() - 1);

  const [ipResponse, companyResponse] = await Promise.all([
    admin
      .from("public_lookup_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since.toISOString()),
    admin
      .from("public_lookup_attempts")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("created_at", since.toISOString()),
    // Limpeza: tentativas com mais de 1 dia nao servem para nada.
    admin
      .from("public_lookup_attempts")
      .delete()
      .lt("created_at", old.toISOString()),
  ]);

  // Sem como controlar tentativas, nao responde (falha fechada).
  if (ipResponse.error || companyResponse.error) {
    console.error("agendar: erro ao checar tentativas de consulta");
    return { status: "error", message: UNAVAILABLE_MESSAGE };
  }

  if (
    (ipResponse.count ?? 0) >= MAX_FAILS_PER_IP ||
    (companyResponse.count ?? 0) >= MAX_FAILS_PER_COMPANY
  ) {
    return {
      status: "error",
      message: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    };
  }

  const { data: appointment, error } = await admin
    .from("appointments")
    .select("public_token, cliente_telefone, status")
    .eq("company_id", companyId)
    .eq("codigo_consulta", code)
    .maybeSingle();

  if (error) {
    console.error("agendar: erro na consulta por codigo", error.code);
    return { status: "error", message: UNAVAILABLE_MESSAGE };
  }

  const row = appointment as {
    public_token: string;
    cliente_telefone: string | null;
    status: string;
  } | null;

  const matches =
    row !== null &&
    row.status !== "excluido" &&
    phoneDigits(row.cliente_telefone ?? "") === phone;

  if (!matches || !row) {
    await admin
      .from("public_lookup_attempts")
      .insert({ company_id: companyId, ip_hash: ipHash });

    return { status: "error", message: NOT_FOUND_MESSAGE };
  }

  return {
    status: "found",
    message: "Abrindo o seu pedido...",
    token: row.public_token,
    path: `/agendar/${slug}/pedido/${row.public_token}`,
  };
}