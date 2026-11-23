"use server";

import { revalidatePath } from "next/cache";

import { getAccessContext, isAdmin } from "@/lib/auth/access";
import { friendlyDbError } from "@/lib/errors";

type ActionState = {
  success: boolean;
  message: string;
};

type Interval = { weekday: number; start: number; end: number };

const INVALID_HOURS_MESSAGE =
  "Confira os horarios: preencha inicio e fim, o fim deve ser depois do inicio e os intervalos do mesmo dia nao podem se sobrepor.";

function parseIntervals(raw: FormDataEntryValue | null): Interval[] | null {
  if (typeof raw !== "string") {
    return null;
  }

  let data: unknown;

  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!Array.isArray(data) || data.length > 70) {
    return null;
  }

  const result: Interval[] = [];

  for (const item of data) {
    if (typeof item !== "object" || item === null) {
      return null;
    }

    const { weekday, start, end } = item as Record<string, unknown>;

    if (
      typeof weekday !== "number" ||
      typeof start !== "number" ||
      typeof end !== "number"
    ) {
      return null;
    }

    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      return null;
    }

    if (!Number.isInteger(start) || start < 0 || start > 1439) {
      return null;
    }

    if (!Number.isInteger(end) || end < 1 || end > 1440 || end <= start) {
      return null;
    }

    result.push({ weekday, start, end });
  }

  return result;
}

function hasOverlap(intervals: Interval[]): boolean {
  const sorted = [...intervals].sort(
    (a, b) => a.weekday - b.weekday || a.start - b.start,
  );

  return sorted.some((item, index) => {
    const previous = sorted[index - 1];

    return (
      previous !== undefined &&
      previous.weekday === item.weekday &&
      item.start < previous.end
    );
  });
}

export async function saveWorkHoursAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const rawEmployeeId = formData.get("employee_id");
  const employeeId = typeof rawEmployeeId === "string" ? rawEmployeeId.trim() : "";
  const intervals = parseIntervals(formData.get("intervals"));

  if (!employeeId || !intervals) {
    return { success: false, message: INVALID_HOURS_MESSAGE };
  }

  if (hasOverlap(intervals)) {
    return { success: false, message: INVALID_HOURS_MESSAGE };
  }

  const { supabase, companyId, role, errorMessage } = await getAccessContext();

  if (!companyId) {
    return {
      success: false,
      message: errorMessage ?? "Nao foi possivel identificar sua empresa.",
    };
  }

  if (!isAdmin(role)) {
    return {
      success: false,
      message: "Apenas administradores podem alterar horarios.",
    };
  }

  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("id", employeeId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!employee) {
    return { success: false, message: "Funcionario nao encontrado." };
  }

  const { error: deleteError } = await supabase
    .from("employee_work_hours")
    .delete()
    .eq("company_id", companyId)
    .eq("employee_id", employeeId);

  if (deleteError) {
    return {
      success: false,
      message: friendlyDbError(
        deleteError,
        "Nao foi possivel salvar os horarios. Tente novamente.",
      ),
    };
  }

  if (intervals.length > 0) {
    const { error: insertError } = await supabase
      .from("employee_work_hours")
      .insert(
        intervals.map((item) => ({
          company_id: companyId,
          employee_id: employeeId,
          weekday: item.weekday,
          start_minute: item.start,
          end_minute: item.end,
        })),
      );

    if (insertError) {
      return {
        success: false,
        message: friendlyDbError(
          insertError,
          "Nao foi possivel salvar os horarios. Tente novamente.",
        ),
      };
    }
  }

  revalidatePath("/painel/horarios");

  return { success: true, message: "Horarios salvos." };
}