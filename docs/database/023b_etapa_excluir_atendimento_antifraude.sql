-- 023b: exclusao "mantem o registro" + protecao contra fraude no banco.
-- Execute no Supabase SQL Editor APOS o 023a. Seguro para reexecucao.
-- Faca backup ou teste antes em um projeto de desenvolvimento.
--
-- O que muda:
--   1) Agendamento excluido NAO some: fica com status 'excluido', guardando quem
--      excluiu, quando, o valor estornado e o motivo.
--   2) Funcionario nao consegue mais, direto pela API, apagar/editar pagamentos
--      nem alterar um atendimento concluido.
--   3) A unica forma de excluir um atendimento (com ou sem pagamento) e a funcao
--      void_appointment, restrita a admin, atomica e com auditoria.
-- Service role e SQL Editor (auth.uid() nulo) continuam livres para manutencao.

-- ---------------------------------------------------------------- colunas
alter table public.appointments
  add column if not exists excluido_em timestamptz,
  add column if not exists excluido_por uuid references auth.users(id) on delete set null,
  add column if not exists valor_estornado numeric(10,2),
  add column if not exists motivo_exclusao text;

-- ---------------------------------------------------------------- appointments: guarda de UPDATE
create or replace function public.guard_appointments_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  -- Excluido e definitivo para todos.
  if old.status = 'excluido' then
    raise exception 'Atendimento excluido nao pode ser alterado.';
  end if;

  -- Marcar como excluido so e permitido depois de remover o pagamento (via void_appointment).
  if new.status = 'excluido' and exists (
    select 1 from public.payments p where p.appointment_id = new.id
  ) then
    raise exception 'Use a exclusao de atendimento para estornar o pagamento.';
  end if;

  if public.is_company_admin() then
    return new;
  end if;

  if old.status = 'concluido' then
    raise exception 'Somente o administrador pode alterar um atendimento concluido.';
  end if;

  if new.status = 'excluido'
     or new.excluido_em is not null
     or new.excluido_por is not null
     or new.valor_estornado is not null
     or new.motivo_exclusao is not null then
    raise exception 'Somente o administrador pode excluir atendimentos.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_appointments_guard_update on public.appointments;
create trigger trg_appointments_guard_update
before update on public.appointments
for each row execute function public.guard_appointments_update();

-- ---------------------------------------------------------------- appointments: DELETE
-- Antes: policy "for all" liberava DELETE para qualquer usuario da empresa.
-- Agora: SELECT/INSERT/UPDATE da empresa; DELETE so de admin e so se nao houver pagamento.
drop policy if exists appointments_crud_same_company on public.appointments;
drop policy if exists appointments_select_same_company on public.appointments;
drop policy if exists appointments_insert_same_company on public.appointments;
drop policy if exists appointments_update_same_company on public.appointments;
drop policy if exists appointments_delete_admin_no_payment on public.appointments;

create policy appointments_select_same_company
on public.appointments for select to authenticated
using (company_id = public.current_company_id());

create policy appointments_insert_same_company
on public.appointments for insert to authenticated
with check (company_id = public.current_company_id());

create policy appointments_update_same_company
on public.appointments for update to authenticated
using (company_id = public.current_company_id())
with check (company_id = public.current_company_id());

create policy appointments_delete_admin_no_payment
on public.appointments for delete to authenticated
using (
  company_id = public.current_company_id()
  and public.is_company_admin()
  and not exists (select 1 from public.payments p where p.appointment_id = appointments.id)
);

-- ---------------------------------------------------------------- payments
-- Antes: policy "for all". Agora: ler e inserir (empresa), editar so admin,
-- e NAO existe DELETE: o pagamento so sai via void_appointment.
drop policy if exists payments_crud_same_company on public.payments;
drop policy if exists payments_select_same_company on public.payments;
drop policy if exists payments_insert_same_company on public.payments;
drop policy if exists payments_update_admin on public.payments;

create policy payments_select_same_company
on public.payments for select to authenticated
using (company_id = public.current_company_id());

create policy payments_insert_same_company
on public.payments for insert to authenticated
with check (company_id = public.current_company_id());

create policy payments_update_admin
on public.payments for update to authenticated
using (company_id = public.current_company_id() and public.is_company_admin())
with check (company_id = public.current_company_id() and public.is_company_admin());

revoke delete on public.payments from authenticated;

-- ---------------------------------------------------------------- funcao de exclusao
create or replace function public.void_appointment(
  p_appointment_id uuid,
  p_motivo text default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid := public.current_company_id();
  v_appt public.appointments%rowtype;
  v_valor numeric(10,2);
  v_motivo text := nullif(trim(coalesce(p_motivo, '')), '');
begin
  if auth.uid() is null or v_company is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if not public.is_company_admin() then
    raise exception 'Somente o administrador pode excluir atendimentos.';
  end if;

  select * into v_appt
  from public.appointments
  where id = p_appointment_id and company_id = v_company
  for update;

  if not found then
    raise exception 'Agendamento nao encontrado.';
  end if;

  if v_appt.status = 'excluido' then
    raise exception 'Este agendamento ja foi excluido.';
  end if;

  select p.valor into v_valor
  from public.payments p
  where p.appointment_id = v_appt.id and p.company_id = v_company;

  delete from public.payments
  where appointment_id = v_appt.id and company_id = v_company;

  update public.appointments
  set status = 'excluido',
      excluido_em = now(),
      excluido_por = auth.uid(),
      valor_estornado = v_valor,
      motivo_exclusao = v_motivo
  where id = v_appt.id and company_id = v_company;

  insert into public.audit_logs (company_id, actor_id, action, entity, entity_id, metadata)
  values (
    v_company,
    auth.uid(),
    'appointment.void',
    'appointment',
    v_appt.id::text,
    jsonb_build_object(
      'cliente_nome', v_appt.cliente_nome,
      'status_anterior', v_appt.status::text,
      'valor_estornado', v_valor,
      'motivo', v_motivo
    )
  );

  return v_valor;
end;
$$;

revoke all on function public.void_appointment(uuid, text) from public;
grant execute on function public.void_appointment(uuid, text) to authenticated;