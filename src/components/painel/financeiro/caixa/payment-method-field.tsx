"use client";

import { useState } from "react";

import { PAYMENT_METHODS, type PaymentMethodValue } from "@/lib/payment-methods";

type PaymentMethodFieldProps = Readonly<{
  idPrefix: string;
  defaultValue: PaymentMethodValue | null;
}>;

export function PaymentMethodField({ idPrefix, defaultValue }: PaymentMethodFieldProps) {
  const [selected, setSelected] = useState<PaymentMethodValue | null>(defaultValue);
  const labelId = `${idPrefix}-forma-label`;

  return (
    <div className="space-y-1">
      <p id={labelId} className="text-sm text-foreground">
        Forma de pagamento
      </p>

      <input type="hidden" name="forma_pagamento" value={selected ?? ""} />

      <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {PAYMENT_METHODS.map((method) => {
          const active = selected === method.value;

          return (
            <button
              key={method.value}
              type="button"
              aria-pressed={active}
              onClick={() => setSelected(method.value)}
              className={`min-h-11 rounded-lg border px-3 text-sm font-medium transition ${
                active
                  ? "border-brand bg-brand/15 text-brand"
                  : "border-border bg-surface text-foreground hover:border-brand"
              }`}
            >
              {method.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
