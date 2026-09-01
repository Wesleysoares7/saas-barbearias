-- Etapa: vincular funcionario ao usuario administrador (auto-cadastro)
-- Execute no Supabase SQL Editor apos a etapa 010.
--
-- Contexto: para detectar se o administrador logado ja possui um registro
-- de funcionario (e permitir o botao "Cadastrar-me como funcionario" na tela
-- de Funcionarios), o registro precisa ficar vinculado ao auth.users. O
-- e-mail tambem passa a ser copiado do perfil quando o auto-cadastro e usado.

alter table public.employees
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists email text;

-- Garante no maximo um registro de funcionario por usuario dentro da mesma empresa
create unique index if not exists idx_employees_company_user_unique
  on public.employees (company_id, user_id)
  where user_id is not null;
