import { CASH_CATEGORY_SUGGESTIONS } from "@/types/cash";

export const CASH_FIELD_CLASS =
  "h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-base text-foreground outline-none focus:border-brand";

export function CashMessage({ success, message }: { success: boolean; message: string }) {
  if (!message || success) {
    return null;
  }

  return (
    <p className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200" aria-live="polite">
      {message}
    </p>
  );
}

export function CashEntryFields({
  idPrefix,
  defaults,
}: {
  idPrefix: string;
  defaults: { valor: string; data: string; categoria: string; descricao: string };
}) {
  const listId = `${idPrefix}-categorias`;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-valor`} className="text-sm text-foreground">
            Valor (R$)
          </label>
          <input
            id={`${idPrefix}-valor`}
            name="valor"
            type="text"
            inputMode="decimal"
            defaultValue={defaults.valor}
            placeholder="0,00"
            className={CASH_FIELD_CLASS}
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-data`} className="text-sm text-foreground">
            Data
          </label>
          <input
            id={`${idPrefix}-data`}
            name="data"
            type="date"
            defaultValue={defaults.data}
            className={CASH_FIELD_CLASS}
            required
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor={`${idPrefix}-categoria`} className="text-sm text-foreground">
          Categoria - opcional
        </label>
        <input
          id={`${idPrefix}-categoria`}
          name="categoria"
          type="text"
          list={listId}
          maxLength={60}
          defaultValue={defaults.categoria}
          className={CASH_FIELD_CLASS}
        />
        <datalist id={listId}>
          {CASH_CATEGORY_SUGGESTIONS.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
      </div>

      <div className="space-y-1">
        <label htmlFor={`${idPrefix}-descricao`} className="text-sm text-foreground">
          Descricao
        </label>
        <input
          id={`${idPrefix}-descricao`}
          name="descricao"
          type="text"
          minLength={2}
          maxLength={200}
          defaultValue={defaults.descricao}
          className={CASH_FIELD_CLASS}
          required
        />
      </div>
    </>
  );
}