const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TOKENS = 5;

function storageKey(slug: string): string {
  return `agendar:v1:${slug}`;
}

export function readBookingTokens(slug: string): string[] {
  try {
    const raw = window.localStorage.getItem(storageKey(slug));

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((value): value is string => typeof value === "string" && UUID.test(value))
      .slice(0, MAX_TOKENS);
  } catch {
    return [];
  }
}

export function saveBookingToken(slug: string, token: string): void {
  if (!UUID.test(token)) {
    return;
  }

  try {
    const current = readBookingTokens(slug).filter((item) => item !== token);

    window.localStorage.setItem(
      storageKey(slug),
      JSON.stringify([token, ...current].slice(0, MAX_TOKENS)),
    );
  } catch {
    // Armazenamento indisponivel (modo privado, etc.): segue sem salvar.
  }
}

export function keepBookingTokens(slug: string, keep: string[]): void {
  try {
    window.localStorage.setItem(
      storageKey(slug),
      JSON.stringify(keep.slice(0, MAX_TOKENS)),
    );
  } catch {
    // ignora
  }
}