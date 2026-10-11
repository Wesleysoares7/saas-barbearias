import type { BillingState } from "@/lib/billing/state";

type Tone = "success" | "warning" | "danger" | "brand" | "neutral";

export function billingPill(billing: BillingState): { tone: Tone; label: string } {
  if (billing.blocked) {
    if (billing.blockReason === "canceled") return { tone: "danger", label: "Cancelada" };
    if (billing.blockReason === "suspended") return { tone: "danger", label: "Suspensa" };
    return { tone: "danger", label: "Teste encerrado" };
  }

  switch (billing.status) {
    case "trial":
      return { tone: "warning", label: "Trial" };
    case "past_due":
      return { tone: "warning", label: "Em atraso" };
    default:
      return { tone: "success", label: "Ativa" };
  }
}