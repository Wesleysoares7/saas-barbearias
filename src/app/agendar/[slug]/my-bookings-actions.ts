"use server";

import { UUID_PATTERN } from "@/lib/agendamento-publico/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type MyBooking = {
  token: string;
  status: "aguardando" | "agendado" | "concluido" | "cancelado";
  dataHora: string;
  servicoNome: string;
  profissionalNome: string;
};

type Row = {
  public_token: string;
  status: MyBooking["status"];
  data_hora: string;
  service_id: string;
  employee_id: string;
};

// Retorna null em caso de erro (o aparelho NAO deve apagar os codigos salvos).
export async function getMyBookingsAction(
  slug: string,
  tokens: string[],
): Promise<MyBooking[] | null> {
  if (typeof slug !== "string" || !/^[a-z0-9-]{3,40}$/.test(slug)) {
    return [];
  }

  if (!Array.isArray(tokens)) {
    return [];
  }

  const valid = [...new Set(tokens)]
    .filter((token): token is string => typeof token === "string" && UUID_PATTERN.test(token))
    .slice(0, 5);

  if (valid.length === 0) {
    return [];
  }

  const admin = createSupabaseAdminClient();

  const { data: company, error: companyError } = await admin
    .from("companies")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (companyError) {
    return null;
  }

  if (!company) {
    return [];
  }

  const companyId = (company as { id: string }).id;
  const since = new Date();

  since.setDate(since.getDate() - 1);

  const { data, error } = await admin
    .from("appointments")
    .select("public_token, status, data_hora, service_id, employee_id")
    .eq("company_id", companyId)
    .in("public_token", valid)
    .in("status", ["aguardando", "agendado", "concluido", "cancelado"])
    .gte("data_hora", since.toISOString())
    .order("data_hora", { ascending: true });

  if (error) {
    return null;
  }

  const rows = (data ?? []) as Row[];

  if (rows.length === 0) {
    return [];
  }

  const [servicesResponse, employeesResponse] = await Promise.all([
    admin
      .from("services")
      .select("id, nome")
      .eq("company_id", companyId)
      .in("id", [...new Set(rows.map((row) => row.service_id))]),
    admin
      .from("employees")
      .select("id, nome")
      .eq("company_id", companyId)
      .in("id", [...new Set(rows.map((row) => row.employee_id))]),
  ]);

  const serviceNames = new Map(
    ((servicesResponse.data ?? []) as { id: string; nome: string }[]).map((item) => [
      item.id,
      item.nome,
    ]),
  );
  const employeeNames = new Map(
    ((employeesResponse.data ?? []) as { id: string; nome: string }[]).map((item) => [
      item.id,
      item.nome,
    ]),
  );

  return rows.map((row) => ({
    token: row.public_token,
    status: row.status,
    dataHora: row.data_hora,
    servicoNome: serviceNames.get(row.service_id) ?? "Serviço",
    profissionalNome: employeeNames.get(row.employee_id) ?? "Profissional",
  }));
}