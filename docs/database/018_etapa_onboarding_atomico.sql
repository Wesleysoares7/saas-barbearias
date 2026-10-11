-- Etapa 18: onboarding atomico (empresa + perfil admin + atendente numa unica transacao)
-- Execute no Supabase SQL Editor APOS 015..017. Seguro para reexecucao. So adiciona uma funcao;
-- nao altera nenhuma policy (o app antigo continua funcionando ate voce publicar o novo).
--
-- Problema corrigido: o onboarding fazia 3 inserts separados. Se o 2o ou o 3o falhava, sobrava uma
-- empresa orfa e a nova tentativa criava outra. Agora tudo acontece dentro de uma funcao: ou grava
-- tudo, ou nao grava nada. A funcao tambem e idempotente (clique duplo devolve a mesma empresa).
-- As mensagens de erro (P0001) sao escritas em portugues e podem ser exibidas ao usuario.

create or replace function public.create_company_with_admin(
  p_nome_responsavel text,
  p_nome_empresa text,
  p_telefone text default null,
  p_endereco text default null,
  p_unico_atendente boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_responsavel text := btrim(coalesce(p_nome_responsavel, ''));
  v_empresa text := btrim(coalesce(p_nome_empresa, ''));
  v_telefone text := nullif(btrim(coalesce(p_telefone, '')), '');
  v_endereco text := nullif(btrim(coalesce(p_endereco, '')), '');
  v_company_id uuid;
begin
  if v_uid is null or v_email = '' then
    raise exception 'Sua sessao expirou. Faca login novamente.';
  end if;

  if char_length(v_responsavel) < 3 or char_length(v_responsavel) > 120 then
    raise exception 'Informe seu nome com 3 a 120 caracteres.';
  end if;

  if char_length(v_empresa) < 2 or char_length(v_empresa) > 120 then
    raise exception 'Informe o nome da empresa com 2 a 120 caracteres.';
  end if;

  if char_length(coalesce(v_telefone, '')) > 30 or char_length(coalesce(v_endereco, '')) > 200 then
    raise exception 'Telefone ou endereco acima do tamanho permitido.';
  end if;

  -- Serializa chamadas simultaneas do mesmo usuario (duplo clique, duas abas).
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  -- Idempotente: se o usuario ja tem empresa, devolve a existente.
  select p.company_id into v_company_id from public.profiles p where p.id = v_uid;
  if found then
    return v_company_id;
  end if;

  insert into public.companies (nome, telefone, endereco)
  values (v_empresa, v_telefone, v_endereco)
  returning id into v_company_id;

  insert into public.profiles (id, company_id, nome, email, role)
  values (v_uid, v_company_id, v_responsavel, v_email, 'admin');

  if coalesce(p_unico_atendente, false) then
    insert into public.employees (company_id, user_id, nome, email, telefone, percentual_comissao, ativo)
    values (v_company_id, v_uid, v_responsavel, v_email, v_telefone, null, true);
  end if;

  return v_company_id;
end;
$$;

revoke all on function public.create_company_with_admin(text, text, text, text, boolean) from public;
revoke all on function public.create_company_with_admin(text, text, text, text, boolean) from anon;
grant execute on function public.create_company_with_admin(text, text, text, text, boolean) to authenticated;

-- ---------------------------------------------------------------- testes (SQL Editor, um bloco por vez)
-- Use o id/e-mail de um usuario de teste que AINDA NAO tenha perfil. Cada bloco termina em ROLLBACK.
--
-- T1) Cria tudo e devolve o id da empresa:
--   begin;
--   select set_config('request.jwt.claims',
--     json_build_object('sub','<ID_USUARIO>','role','authenticated','email','<EMAIL>')::text, true);
--   set local role authenticated;
--   select public.create_company_with_admin('Fulano de Tal', 'Barbearia Teste', '11999990000', 'Rua X, 1', true);
--   select id, role from public.profiles where id = '<ID_USUARIO>';
--   select nome, percentual_comissao from public.employees where user_id = '<ID_USUARIO>';
--   rollback;
--
-- T2) Idempotencia: chamar duas vezes na mesma transacao devolve o MESMO uuid.
-- T3) Nome da empresa com 1 caractere -> ERRO "Informe o nome da empresa com 2 a 120 caracteres."
-- T4) Sem jwt (SQL Editor puro) -> ERRO "Sua sessao expirou. Faca login novamente."