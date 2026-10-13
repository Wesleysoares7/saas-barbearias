// Preencha TODOS os campos que começam com "[PREENCHER" antes de publicar.
// Dica: procure por "PREENCHER" no projeto (Ctrl+Shift+F) para garantir que nada ficou para trás.
export const LEGAL = {
  produto: "Saas Gestão de Agendamentos",
  razaoSocial: "61.472.037 WESLEY SILVA SOARES (Empresário Individual)",
  documento: "61.472.037/0001-07",
  endereco: "Parnaíba - PI",
  emailSuporte: "contato@wesleysoares7.com.br",
  emailPrivacidade: "privacidade@wesleysoares7.com.br",
  foro: "Parnaíba - PI",
  regiaoServidores: "São Paulo (sa-east-1)",
  diasExportacao: "30",
  diasExclusao: "90",
  diasAvisoAlteracao: "30",
  versao: "2026-10-11",
  vigencia: "11 de outubro de 2026",
} as const;

export function hasLegalPlaceholders(): boolean {
  return Object.values(LEGAL).some((value) => value.includes("[PREENCHER"));
}
