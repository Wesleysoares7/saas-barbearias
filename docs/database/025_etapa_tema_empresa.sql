-- Etapa 25: tema de cores da empresa
-- Execute no Supabase SQL Editor APOS 001..024. Seguro para reexecucao.
--
-- Cada empresa escolhe uma paleta (cor de destaque do app). O valor e uma chave de uma
-- lista fixa; as cores em si ficam no codigo (src/lib/themes.ts), nunca no banco.
-- Quem altera: administrador da empresa, pela policy companies_update_admin ja existente
-- (o gatilho de 020 so protege plano/status, entao a coluna nova nao precisa de ajuste).
-- Se criar um tema novo no codigo, inclua a chave tambem no check abaixo.

alter table public.companies
  add column if not exists tema text not null default 'ouro';

alter table public.companies
  drop constraint if exists companies_tema_check;

alter table public.companies
  add constraint companies_tema_check
  check (tema in ('ouro', 'vermelho', 'azul', 'verde', 'cobre', 'roxo'));

-- O UPDATE em companies e liberado por coluna no seu banco (a logo funciona, a coluna nova nao):
-- sem este GRANT o app recebe o erro 42501 (permission denied) ao salvar o tema.
grant update (tema) on public.companies to authenticated;

-- Conferencia:
--   select nome, tema from public.companies;