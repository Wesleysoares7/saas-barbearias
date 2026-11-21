export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidCpf(digits: string): boolean {
  if (digits.length !== 11) {
    return false;
  }

  if (/^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i], 10) * (10 - i);
  }

  let remainder = sum % 11;
  let firstCheckDigit = remainder < 2 ? 0 : 11 - remainder;

  if (parseInt(digits[9], 10) !== firstCheckDigit) {
    return false;
  }

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i], 10) * (11 - i);
  }

  remainder = sum % 11;
  let secondCheckDigit = remainder < 2 ? 0 : 11 - remainder;

  if (parseInt(digits[10], 10) !== secondCheckDigit) {
    return false;
  }

  return true;
}

export function isValidCnpj(digits: string): boolean {
  if (digits.length !== 14) {
    return false;
  }

  if (/^(\d)\1{13}$/.test(digits)) {
    return false;
  }

  let sum = 0;
  let multiplier = 5;

  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i], 10) * multiplier;
    multiplier = multiplier === 2 ? 9 : multiplier - 1;
  }

  let remainder = sum % 11;
  let firstCheckDigit = remainder < 2 ? 0 : 11 - remainder;

  if (parseInt(digits[12], 10) !== firstCheckDigit) {
    return false;
  }

  sum = 0;
  multiplier = 6;

  for (let i = 0; i < 13; i++) {
    sum += parseInt(digits[i], 10) * multiplier;
    multiplier = multiplier === 2 ? 9 : multiplier - 1;
  }

  remainder = sum % 11;
  let secondCheckDigit = remainder < 2 ? 0 : 11 - remainder;

  if (parseInt(digits[13], 10) !== secondCheckDigit) {
    return false;
  }

  return true;
}

export type ValidateDocumentoResult =
  | { ok: true; digits: string; type: "cpf" | "cnpj" }
  | { ok: false };

export function validateDocumento(value: string): ValidateDocumentoResult {
  const digits = onlyDigits(value);

  if (digits.length === 11 && isValidCpf(digits)) {
    return { ok: true, digits, type: "cpf" };
  }

  if (digits.length === 14 && isValidCnpj(digits)) {
    return { ok: true, digits, type: "cnpj" };
  }

  return { ok: false };
}

export function formatDocumento(digits: string): string {
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }

  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }

  return digits;
}
