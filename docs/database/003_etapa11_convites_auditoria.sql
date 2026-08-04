-- Etapa 11 - Convites da equipe e trilha de auditoria
-- Execute no Supabase SQL Editor apos a Etapa 3.

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'invite_status'
      and n.nspname = 'public'
  ) then
    create type public.invite_status as enum ('pending', 'accepted', 'revoked', 'expired');
  end if;
end
$$;

create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role public.user_role not null default 'employee',
  status public.invite_status not null default 'pending',
  token text not null,
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_invites_email_lower check (email = lower(email)),
  constraint team_invites_token_unique unique (token)
);

create index if not exists idx_team_invites_company_id on public.team_invites(company_id);
create index if not exists idx_team_invites_status on public.team_invites(status);
create index if not exists idx_team_invites_expires_at on public.team_invites(expires_at);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_company_created_at on public.audit_logs(company_id, created_at desc);
create index if not exists idx_audit_logs_action on public.audit_logs(action);

drop trigger if exists trg_team_invites_updated_at on public.team_invites;
create trigger trg_team_invites_updated_at
before update on public.team_invites
for each row
execute function public.set_updated_at();

alter table public.team_invites enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists team_invites_select_same_company on public.team_invites;
drop policy if exists team_invites_insert_admin_same_company on public.team_invites;
drop policy if exists team_invites_update_admin_same_company on public.team_invites;
drop policy if exists team_invites_delete_admin_same_company on public.team_invites;
drop policy if exists team_invites_select_invited_email on public.team_invites;
drop policy if exists team_invites_update_invited_accept on public.team_invites;

drop policy if exists audit_logs_select_same_company on public.audit_logs;
drop policy if exists audit_logs_insert_same_company on public.audit_logs;

create policy team_invites_select_same_company
on public.team_invites
for select
to authenticated
using (company_id = public.current_company_id());

create policy team_invites_select_invited_email
on public.team_invites
for select
to authenticated
using (
  email = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create policy team_invites_insert_admin_same_company
on public.team_invites
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

create policy team_invites_update_admin_same_company
on public.team_invites
for update
to authenticated
using (
  company_id = public.current_company_id()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = public.current_company_id()
      and p.role = 'admin'
  )
)
with check (company_id = public.current_company_id());

create policy team_invites_update_invited_accept
on public.team_invites
for update
to authenticated
using (
  status = 'pending'
  and email = lower(coalesce(auth.jwt() ->> 'email', ''))
)
with check (
  email = lower(coalesce(auth.jwt() ->> 'email', ''))
  and status in ('accepted', 'expired')
  and accepted_by = auth.uid()
);

create policy team_invites_delete_admin_same_company
on public.team_invites
for delete
to authenticated
using (
  company_id = public.current_company_id()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = public.current_company_id()
      and p.role = 'admin'
  )
);

create policy audit_logs_select_same_company
on public.audit_logs
for select
to authenticated
using (company_id = public.current_company_id());

create policy audit_logs_insert_same_company
on public.audit_logs
for insert
to authenticated
with check (company_id = public.current_company_id());
