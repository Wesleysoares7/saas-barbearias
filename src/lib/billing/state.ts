export type CompanyStatus = "trial" | "active" | "past_due" | "suspended" | "canceled";

export type BlockReason = "suspended" | "canceled" | "trial_expired";

export type BillingState = {
  status: CompanyStatus;
  plan: string | null;
  trialEndsAt: string | null;
  billingExempt: boolean;
  blocked: boolean;
  blockReason: BlockReason | null;
  trialDaysLeft: number | null;
  banner: "trial" | "trial_ending" | "past_due" | null;
};

export type BillingRow = {
  status?: string | null;
  plan?: string | null;
  trial_ends_at?: string | null;
  suspended_at?: string | null;
  billing_exempt?: boolean | null;
};

export const BILLING_SELECT = "status, plan, trial_ends_at, suspended_at, billing_exempt";

const DAY_MS = 86400000;

export function resolveBillingState(row: BillingRow, now: Date = new Date()): BillingState {
  const status = (row.status ?? "active") as CompanyStatus;
  const billingExempt = Boolean(row.billing_exempt);
  const base: BillingState = {
    status,
    plan: row.plan ?? null,
    trialEndsAt: row.trial_ends_at ?? null,
    billingExempt,
    blocked: false,
    blockReason: null,
    trialDaysLeft: null,
    banner: null,
  };

  if (status === "canceled" || status === "suspended") {
    return { ...base, blocked: true, blockReason: status };
  }

  if (status === "trial") {
    if (billingExempt) {
      return base;
    }

    if (row.trial_ends_at) {
      const end = new Date(row.trial_ends_at).getTime();

      if (!Number.isNaN(end)) {
        if (now.getTime() > end) {
          return { ...base, blocked: true, blockReason: "trial_expired", trialDaysLeft: 0 };
        }

        const daysLeft = Math.max(0, Math.ceil((end - now.getTime()) / DAY_MS));
        return { ...base, trialDaysLeft: daysLeft, banner: daysLeft <= 3 ? "trial_ending" : "trial" };
      }
    }

    return base;
  }

  if (status === "past_due") {
    return { ...base, banner: billingExempt ? null : "past_due" };
  }

  return base;
}

export function blockedMessage(reason: BlockReason | null): string {
  switch (reason) {
    case "suspended":
      return "Sua conta esta suspensa. Entre em contato com o suporte para regularizar.";
    case "canceled":
      return "Esta conta foi encerrada. Entre em contato com o suporte se precisar de ajuda.";
    case "trial_expired":
      return "O periodo de teste terminou. Fale com o suporte para continuar usando o sistema.";
    default:
      return "Acesso indisponivel no momento.";
  }
}