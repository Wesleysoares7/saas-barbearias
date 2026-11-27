
export const BOOKING_CODE_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{6}$/;

export function normalizeBookingCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatBookingCode(code: string | null | undefined): string {
  if (!code) {
    return "";
  }

  return code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
}