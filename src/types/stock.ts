export type StockUnit = "un" | "ml" | "l" | "g" | "kg";
export type StockMovementType = "entrada" | "saida";
export type StockMovementReason = "compra" | "devolucao" | "ajuste" | "uso_interno" | "venda" | "perda";

export type Product = {
  id: string;
  nome: string;
  categoria: string | null;
  sku: string | null;
  unidade: StockUnit;
  estoque_minimo: number;
  quantidade_atual: number;
  custo_medio: number;
  ativo: boolean;
};

export type StockMovement = {
  id: string;
  product_id: string;
  tipo: StockMovementType;
  motivo: StockMovementReason;
  quantidade: number;
  custo_unitario: number;
  custo_total: number;
  observacao: string | null;
  data_movimento: string;
  products: { nome: string; unidade: StockUnit } | { nome: string; unidade: StockUnit }[] | null;
};

export const STOCK_UNITS: StockUnit[] = ["un", "ml", "l", "g", "kg"];

export const ALLOWED_REASONS: Record<StockMovementType, StockMovementReason[]> = {
  entrada: ["compra", "devolucao", "ajuste"],
  saida: ["uso_interno", "venda", "perda", "ajuste"],
};

export const REASON_LABELS: Record<StockMovementReason, string> = {
  compra: "Compra",
  devolucao: "Devolucao",
  ajuste: "Ajuste",
  uso_interno: "Uso interno",
  venda: "Venda",
  perda: "Perda",
};
