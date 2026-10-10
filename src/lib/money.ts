const MAX_MONEY_ABS = 9999999.99;

export function parseMoneyBR(value: string): number | null {
  let cleaned = value.replace(/R\$/gi, "").replace(/\s+/g, "");

  if (!cleaned || !/^-?[\d.,]+$/.test(cleaned)) {
    return null;
  }

  const negative = cleaned.startsWith("-");
  cleaned = negative ? cleaned.slice(1) : cleaned;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  if (lastComma >= 0) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (lastDot >= 0) {
    const dotCount = cleaned.split(".").length - 1;
    const decimals = cleaned.length - lastDot - 1;

    if (dotCount > 1 || decimals === 3) {
      cleaned = cleaned.replace(/\./g, "");
    }
  }

  if (!/^\d+(\.\d+)?$/.test(cleaned)) {
    return null;
  }

  const parsed = Math.round(Number(cleaned) * 100) / 100;

  if (!Number.isFinite(parsed) || parsed > MAX_MONEY_ABS) {
    return null;
  }

  return negative ? -parsed : parsed;
}