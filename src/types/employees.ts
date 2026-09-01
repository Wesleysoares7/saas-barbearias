export interface Employee {
  id: string;
  nome: string;
  telefone?: string;
  percentual_comissao: number | null;
  ativo: boolean;
}
