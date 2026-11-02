export const PAYMENT_METHODS = [
  { value: "pix", label: "Pix" },
  { value: "cartao_credito", label: "Cartao credito" },
  { value: "cartao_debito", label: "Cartao debito" },
  { value: "dinheiro", label: "Dinheiro" },
] as const;

export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number]["value"];

export const DEFAULT_PAYMENT_METHOD: PaymentMethodValue = "pix";

export function isPaymentMethod(value: string): value is PaymentMethodValue {
  return PAYMENT_METHODS.some((method) => method.value === value);
}

// Dados antigos digitados a mao nao estao na lista: devolve o proprio texto.
export function getPaymentMethodLabel(value: string): string {
  return PAYMENT_METHODS.find((method) => method.value === value)?.label ?? value;
}
