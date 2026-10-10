-- Etapa 17: vinculo entre clientes e agendamentos
-- Execute no Supabase SQL Editor APOS 001..016. Seguro para reexecucao.
-- Rode em BLOCOS, na ordem. O bloco 4 (backfill) e opcional e tem previa antes.
--
-- O que resolve:
--   1) Qualquer membro da empresa (inclusive funcionario) pode CADASTRAR cliente. Necessario para
--      criar cliente direto no agendamento. Editar e excluir clientes continua so para admin.
--   2) Telefones de clientes ficam so com digitos (base para evitar duplicados).
--   3) Indices para a busca por telefone e por nome.
--   4) (opcional) Cria clientes a partir de agendamentos antigos que ficaram sem vinculo e liga os dois,
--      sem duplicar clientes que ja existem.

-- ================================================================ 1) policy de insert
drop policy if exists customers_insert_admin_same_company on public.customers;
drop policy if exists customers_insert_same_company on public.customers;

create policy customers_insert_same_company
on public.customers
for insert
to authenticated
with check (company_id = public.current_company_id());

-- ================================================================ 2) telefones so com digitos
update public.customers
set telefone = nullif(regexp_replace(telefone, '\D', '', 'g'), '')
where telefone is not null
  and telefone ~ '\D';

-- ================================================================ 3) indices de busca
create index if not exists idx_customers_company_telefone
  on public.customers (company_id, telefone)
  where telefone is not null;

create index if not exists idx_customers_company_nome_lower
  on public.customers (company_id, lower(trim(nome)));

-- ================================================================ 4) backfill (OPCIONAL)
-- Previa: quantos agendamentos estao sem cliente vinculado, por empresa.
--   select c.nome as empresa, count(*) as agendamentos_sem_cliente
--   from public.appointments a
--   join public.companies c on c.id = a.company_id
--   where a.customer_id is null
--   group by c.nome
--   order by 2 desc;
--
-- Chave de identificacao: telefone com 10+ digitos; sem telefone valido, o nome (ignorando maiusculas).
-- Rode os tres comandos abaixo em sequencia (B1, B2, B3).

-- B1) liga agendamentos a clientes que JA existem
update public.appointments a
set customer_id = c.id
from public.customers c
where a.customer_id is null
  and c.company_id = a.company_id
  and (
    (
      length(regexp_replace(coalesce(a.cliente_telefone, ''), '\D', '', 'g')) >= 10
      and regexp_replace(coalesce(c.telefone, ''), '\D', '', 'g')
          = regexp_replace(coalesce(a.cliente_telefone, ''), '\D', '', 'g')
    )
    or (
      length(regexp_replace(coalesce(a.cliente_telefone, ''), '\D', '', 'g')) < 10
      and lower(trim(c.nome)) = lower(trim(a.cliente_nome))
    )
  );

-- B2) cria clientes para o que sobrou (um por empresa + chave)
insert into public.customers (company_id, nome, telefone, ativo)
select distinct on (x.company_id, k.chave)
       x.company_id,
       trim(x.cliente_nome),
       case when length(x.digitos) >= 10 then x.digitos else nullif(x.digitos, '') end,
       true
from (
  select a.company_id,
         a.cliente_nome,
         a.created_at,
         regexp_replace(coalesce(a.cliente_telefone, ''), '\D', '', 'g') as digitos
  from public.appointments a
  where a.customer_id is null
    and char_length(trim(a.cliente_nome)) >= 2
) x
cross join lateral (
  select case
           when length(x.digitos) >= 10 then 'f:' || x.digitos
           else 'n:' || lower(trim(x.cliente_nome))
         end as chave
) k
order by x.company_id, k.chave, x.created_at desc;

-- B3) liga os agendamentos restantes aos clientes recem-criados (mesma regra do B1)
update public.appointments a
set customer_id = c.id
from public.customers c
where a.customer_id is null
  and c.company_id = a.company_id
  and (
    (
      length(regexp_replace(coalesce(a.cliente_telefone, ''), '\D', '', 'g')) >= 10
      and regexp_replace(coalesce(c.telefone, ''), '\D', '', 'g')
          = regexp_replace(coalesce(a.cliente_telefone, ''), '\D', '', 'g')
    )
    or (
      length(regexp_replace(coalesce(a.cliente_telefone, ''), '\D', '', 'g')) < 10
      and lower(trim(c.nome)) = lower(trim(a.cliente_nome))
    )
  );

-- Conferencia (esperado: sem_cliente = 0 ou so registros com nome invalido):
--   select count(*) filter (where customer_id is null) as sem_cliente,
--          count(*) filter (where customer_id is not null) as com_cliente
--   from public.appointments;