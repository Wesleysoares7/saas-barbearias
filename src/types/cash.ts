export type CashEntryType = "saldo_inicial" | "entrada" | "despesa";

export type CashEntry = {
  id: string;
  company_id: string;
  tipo: CashEntryType;
  valor: number;
  categoria: string | null;
  descricao: string | null;
  data_lancamento: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type FinanceSummary = {
  saldo_inicial_valor: number | null;
  saldo_inicial_data: string | null;
  saldo_anterior: number;
  saldo_inicial_no_periodo: number;
  receitas: number;
  comissoes: number;
  compras_estoque: number;
  entradas_avulsas: number;
  despesas: number;
  consumo_estoque: number;
  saldo_final: number;
};

export const CASH_CATEGORY_SUGGESTIONS = [
  "Aluguel",
  "Energia",
  "Agua",
  "Internet",
  "Produtos",
  "Salarios e retiradas",
  "Impostos",
  "Manutencao",
  "Venda de produtos",
  "Outros",
] as const;