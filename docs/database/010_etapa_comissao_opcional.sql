-- Etapa: tornar percentual de comissao opcional para funcionarios
-- Execute no Supabase SQL Editor apos a etapa 010.
--
-- Contexto: o cadastro de funcionario passou a permitir salvar sem definir
-- o percentual de comissao (ex.: administrador que atua como atendente unico
-- e ainda nao decidiu a comissao). A coluna era NOT NULL, o que bloqueava
-- o insert com valor nulo.

alter table public.employees
  alter column percentual_comissao drop not null,
  alter column percentual_comissao drop default;
