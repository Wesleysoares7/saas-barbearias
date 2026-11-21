export type SupportContact = {
  whatsapp: string | null;
  email: string | null;
};

export function getSupportContact(): SupportContact {
  const whatsapp = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "").replace(/\D/g, "");
  const email = (process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "").trim();

  return { whatsapp: whatsapp || null, email: email || null };
}

export function whatsappLink(whatsapp: string, text?: string): string {
  const base = `https://wa.me/${whatsapp}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function getPlanContactUrl(): string | null {
  const url = (process.env.NEXT_PUBLIC_PLAN_CONTACT_URL ?? "").trim();
  if (url) {
    return url;
  }

  const support = getSupportContact();
  if (support.whatsapp) {
    return whatsappLink(support.whatsapp);
  }

  if (support.email) {
    return `mailto:${support.email}`;
  }

  return null;
}