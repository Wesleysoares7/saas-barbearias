// Preencha TODOS os campos que começam com "[PREENCHER" antes de publicar.
// Dica: procure por "PREENCHER" no projeto (Ctrl+Shift+F) para garantir que nada ficou para trás.
export const LEGAL = {
  produto: "[PREENCHER: nome do sistema]",
  razaoSocial: "[PREENCHER: razão social ou seu nome completo]",
  documento: "[PREENCHER: CNPJ ou CPF]",
  endereco: "[PREENCHER: endereço completo]",
  emailSuporte: "[PREENCHER: e-mail de suporte]",
  emailPrivacidade: "[PREENCHER: e-mail para assuntos de privacidade/LGPD]",
  foro: "[PREENCHER: cidade/UF do foro]",
  regiaoServidores:
    "[PREENCHER: região do projeto Supabase, ex.: São Paulo (sa-east-1)]",
  diasExportacao: "[PREENCHER: ex.: 30]",
  diasExclusao: "[PREENCHER: ex.: 90]",
  diasAvisoAlteracao: "[PREENCHER: ex.: 30]",
  versao: "2026-10-11",
  vigencia: "11 de outubro de 2026",
} as const;

export function hasLegalPlaceholders(): boolean {
  return Object.values(LEGAL).some((value) => value.includes("[PREENCHER"));
}
