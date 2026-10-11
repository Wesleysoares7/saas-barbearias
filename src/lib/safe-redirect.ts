export function safeNextPath(raw: string | null | undefined, fallback: string): string {
  if (!raw) {
    return fallback;
  }

  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return fallback;
  }

  if (raw.includes("\\") || /[\u0000-\u001F\u007F]/.test(raw)) {
    return fallback;
  }

  return raw;
}
