export type AppointmentRow = {
  id: string;
  cliente_nome: string;
  data_hora: string;
  status: "agendado" | "concluido" | "cancelado";
  service_id: string;
  employee_id: string;
};

export type ServiceRow = {
  id: string;
  valor: number;
};

export type EmployeeRow = {
  id: string;
  nome: string;
  percentual_comissao: number | null;
};

export type PaymentRow = {
  id: string;
  appointment_id: string;
  created_at: string;
  valor: number;
  forma_pagamento: string;
  percentual_comissao: number;
  valor_comissao: number;
  taxa_percentual: number;
  valor_taxa: number;
  appointments:
    | {
        cliente_nome: string;
        data_hora: string;
        employee_id: string;
      }
    | {
        cliente_nome: string;
        data_hora: string;
        employee_id: string;
      }[]
    | null;
};

export type AppointmentOption = {
  id: string;
  clienteNome: string;
  dataHora: string;
  valorSugerido: number;
  percentualComissaoSugerido: number;
};

export type EmployeeFinancialSummary = {
  id: string;
  nome: string;
  percentualComissao: number;
  quantidadePagamentos: number;
  faturamento: number;
  comissaoTotal: number;
};

export type Tab = "resumo" | "caixa" | "funcionarios" | "pagamentos";

export type SearchParams = {
  aba?: string;
  start?: string;
  end?: string;
};

export type PaymentItem = {
  id: string;
  appointmentId: string;
  createdAt: string;
  clienteNome: string;
  dataHora: string;
  valor: number;
  formaPagamento: string;
  percentualComissao: number;
  valorComissao: number;
  taxaPercentual: number;
  valorTaxa: number;
};

export type PaymentMethodGroup = {
  value: string;
  label: string;
  quantidadePagamentos: number;
  totalBruto: number;
  totalTaxa: number;
  totalLiquido: number;
};

export type OpeningEntry = {
  id: string;
  valor: number;
  valorPix: number;
  valorConta: number;
  data: string;
};

export type Indicator = {
  label: string;
  value: string;
};

export type StatementLine = {
  label: string;
  value: string;
};
