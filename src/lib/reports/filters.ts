export function sanitizeText(value: string | null): string {
  return (value ?? "").trim();
}

export function normalizeDate(value: string, fallback: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fallback;
  }

  return value;
}

export function formatMetadata(metadata: Record<string, unknown>): string {
  try {
    return JSON.stringify(metadata);
  } catch {
    return "{}";
  }
}
