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