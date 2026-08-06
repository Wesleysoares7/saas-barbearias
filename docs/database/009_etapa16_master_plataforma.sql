-- Etapa 16: Acesso master da plataforma (visao global)

create table if not exists public.platform_admins (
  user_id uuid primary key,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.platform_admins is 'Usuarios master com acesso global de plataforma.';

alter table public.platform_admins enable row level security;

drop policy if exists platform_admins_select_self on public.platform_admins;
create policy platform_admins_select_self
on public.platform_admins
for select
to authenticated
using (user_id = auth.uid());

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  );
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

drop policy if exists companies_select_platform_admin on public.companies;
create policy companies_select_platform_admin
on public.companies
for select
to authenticated
using (public.is_platform_admin());

-- Uso inicial:
-- insert into public.platform_admins (user_id) values ('SEU_USER_ID_AQUI');
