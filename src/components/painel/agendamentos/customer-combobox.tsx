"use client";

import { type KeyboardEvent, useId, useMemo, useState } from "react";

export type ComboboxCustomer = {
  id: string;
  nome: string;
  telefone?: string | null;
};

type CustomerComboboxProps = {
  customers: ComboboxCustomer[];
  onSelectionChange?: (customerId: string) => void;
  optional?: boolean;
};

const INPUT_CLASS =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-amber-400";

function fold(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function CustomerCombobox({ customers, onSelectionChange, optional = false }: CustomerComboboxProps) {
  const listId = useId();
  const [text, setText] = useState("");
  const [phone, setPhone] = useState("");
  const [selected, setSelected] = useState<ComboboxCustomer | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const query = fold(text.trim());
    const digits = text.replace(/\D/g, "");

    if (query.length === 0) {
      return [];
    }

    return customers
      .filter((customer) => {
        if (fold(customer.nome).includes(query)) {
          return true;
        }

        return digits.length > 0 && (customer.telefone ?? "").replace(/\D/g, "").includes(digits);
      })
      .slice(0, 8);
  }, [customers, text]);

  function choose(customer: ComboboxCustomer) {
    setSelected(customer);
    setText(customer.nome);
    setPhone(customer.telefone ?? "");
    setOpen(false);
    onSelectionChange?.(customer.id);
  }

  function clearSelection() {
    setSelected(null);
    setText("");
    setPhone("");
    setActive(0);
    onSelectionChange?.("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open && results[active]) {
      event.preventDefault();
      choose(results[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const isNew = !selected && text.trim().length >= 2;

  return (
    <>
      <div className="space-y-1 md:col-span-2">
        <label htmlFor={`${listId}-input`} className="text-sm text-zinc-200">
          Cliente (nome ou telefone){optional ? " - opcional" : ""}
        </label>
        <div className="relative flex gap-2">
          <input
            id={`${listId}-input`}
            name="cliente_nome"
            type="text"
            role="combobox"
            aria-expanded={open && results.length > 0}
            aria-controls={`${listId}-list`}
            aria-autocomplete="list"
            autoComplete="off"
            value={text}
            readOnly={selected !== null}
            onChange={(event) => {
              setText(event.target.value);
              setOpen(true);
              setActive(0);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={handleKeyDown}
            className={INPUT_CLASS}
            placeholder="Digite para buscar ou cadastrar"
            required={!optional}
          />
          {selected ? (
            <button
              type="button"
              onClick={clearSelection}
              className="min-h-11 shrink-0 rounded-lg border border-border bg-surface px-4 text-sm text-zinc-100 hover:border-amber-400"
            >
              Trocar
            </button>
          ) : null}

          {open && !selected && results.length > 0 ? (
            <ul
              id={`${listId}-list`}
              role="listbox"
              className="absolute top-full right-0 left-0 z-20 mt-1 max-h-80 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg"
            >
              {results.map((customer, index) => (
                <li
                  key={customer.id}
                  role="option"
                  aria-selected={index === active}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    choose(customer);
                  }}
                  className={`flex min-h-11 cursor-pointer flex-col justify-center px-3 py-1 text-sm ${
                    index === active ? "bg-surface-2 text-brand" : "text-zinc-100"
                  }`}
                >
                  <span className="truncate font-medium">{customer.nome}</span>
                  {customer.telefone ? <span className="truncate text-xs text-muted-foreground">{customer.telefone}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <input type="hidden" name="customer_id" value={selected?.id ?? ""} />
      </div>

      {selected ? (
        <div className="space-y-1">
          <label htmlFor={`${listId}-phone`} className="text-sm text-zinc-200">
            Telefone
          </label>
          <input
            id={`${listId}-phone`}
            type="tel"
            value={phone}
            readOnly
            className={`${INPUT_CLASS} opacity-80`}
          />
        </div>
      ) : null}

      {isNew ? (
        <>
          <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-amber-200 md:col-span-2">
            Novo cliente: sera cadastrado ao salvar
          </p>
          <div className="space-y-1">
            <label htmlFor={`${listId}-tel`} className="text-sm text-zinc-200">
              Telefone (opcional)
            </label>
            <input
              id={`${listId}-tel`}
              name="cliente_telefone"
              type="tel"
              className={INPUT_CLASS}
              placeholder="(11) 99999-9999"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor={`${listId}-email`} className="text-sm text-zinc-200">
              E-mail (opcional)
            </label>
            <input
              id={`${listId}-email`}
              name="cliente_email"
              type="email"
              className={INPUT_CLASS}
              placeholder="cliente@email.com"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label htmlFor={`${listId}-obs`} className="text-sm text-zinc-200">
              Observacoes do cliente (opcional)
            </label>
            <textarea
              id={`${listId}-obs`}
              name="cliente_observacoes"
              rows={2}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400"
            />
          </div>
        </>
      ) : null}
    </>
  );
}
