// Paletas de cor da empresa. Cada tema troca so a cor de destaque (marca);
// fundo e superficies continuam escuros. Os valores ficam aqui no codigo e o banco
// guarda apenas a chave (companies.tema), entao nao existe cor arbitraria vinda do usuario.
// Contraste (WCAG) conferido: destaque sobre o fundo e texto sobre o destaque >= 4.5.
// Ao criar um tema novo, inclua a chave tambem no check de companies_tema_check (SQL 025).

export const THEMES = [
  {
    value: "ouro",
    label: "Ouro",
    description: "Preto e dourado, o visual classico.",
    brand: "#F5B301",
    brandForeground: "#1A1400",
  },
  {
    value: "vermelho",
    label: "Vermelho barbeiro",
    description: "O vermelho do poste de barbearia.",
    brand: "#EF4444",
    brandForeground: "#1F0505",
  },
  {
    value: "azul",
    label: "Azul marinho",
    description: "Sobrio e elegante.",
    brand: "#4C8DF6",
    brandForeground: "#04122B",
  },
  {
    value: "verde",
    label: "Verde garrafa",
    description: "Classico de barbearia tradicional.",
    brand: "#34B27B",
    brandForeground: "#04170E",
  },
  {
    value: "cobre",
    label: "Cobre",
    description: "Tom quente, de bronze e couro.",
    brand: "#D98A4E",
    brandForeground: "#1F1005",
  },
  {
    value: "roxo",
    label: "Roxo",
    description: "Moderno e marcante.",
    brand: "#A78BFA",
    brandForeground: "#12082B",
  },
] as const;

export type ThemeId = (typeof THEMES)[number]["value"];
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: ThemeId = "ouro";

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEMES.some((theme) => theme.value === value);
}

export function getTheme(value: unknown): Theme {
  return THEMES.find((theme) => theme.value === value) ?? THEMES[0];
}

// CSS aplicado em :root para valer tambem em dialogs (que o React renderiza fora da arvore do painel).
// "html:root" tem mais especificidade que o :root do globals.css, entao sobrescreve as cores padrao.
export function getThemeCss(value: unknown): string {
  const theme = getTheme(value);

  return `html:root{--brand:${theme.brand};--brand-foreground:${theme.brandForeground};--primary:${theme.brand};--primary-foreground:${theme.brandForeground};--ring:${theme.brand};}`;
}