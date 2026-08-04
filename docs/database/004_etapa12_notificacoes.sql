-- Etapa 12 - Automacoes de notificacao para eventos sensiveis
-- Execute no Supabase SQL Editor apos a Etapa 11.

create table if not exists public.security_notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_key text not null,
  title text not null,
  message text not null,
  severity text not null default 'warning',
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint security_notifications_severity_check check (severity in ('info', 'warning', 'critical'))
);

create index if not exists idx_security_notifications_company_created
  on public.security_notifications(company_id, created_at desc);
create index if not exists idx_security_notifications_recipient_read
  on public.security_notifications(recipient_id, read_at);
create index if not exists idx_security_notifications_event_key
  on public.security_notifications(event_key);

alter table public.security_notifications enable row level security;

drop policy if exists security_notifications_select_recipient on public.security_notifications;
drop policy if exists security_notifications_insert_admin_same_company on public.security_notifications;
drop policy if exists security_notifications_update_recipient on public.security_notifications;

create policy security_notifications_select_recipient
on public.security_notifications
for select
to authenticated
using (
  company_id = public.current_company_id()
  and recipient_id = auth.uid()
);

create policy security_notifications_insert_admin_same_company
on public.security_notifications
for insert
to authenticated
with check (
  company_id = public.current_company_id()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = public.current_company_id()
      and p.role = 'admin'
  )
);

create policy security_notifications_update_recipient
on public.security_notifications
for update
to authenticated
using (
  company_id = public.current_company_id()
  and recipient_id = auth.uid()
)
with check (
  company_id = public.current_company_id()
  and recipient_id = auth.uid()
);
