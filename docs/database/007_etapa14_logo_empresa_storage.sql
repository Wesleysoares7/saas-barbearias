-- Etapa 14: Bucket e policies para logo da empresa
-- Execute no Supabase SQL Editor.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-logos',
  'company-logos',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Remove policies antigas (idempotente)
drop policy if exists company_logos_select_same_company on storage.objects;
drop policy if exists company_logos_insert_admin_same_company on storage.objects;
drop policy if exists company_logos_update_admin_same_company on storage.objects;
drop policy if exists company_logos_delete_admin_same_company on storage.objects;

-- Leitura liberada para usuarios autenticados da mesma empresa
create policy company_logos_select_same_company
on storage.objects
for select
to authenticated
using (
  bucket_id = 'company-logos'
  and split_part(name, '/', 1) = public.current_company_id()::text
);

-- Escrita liberada somente para admins da empresa
create policy company_logos_insert_admin_same_company
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'company-logos'
  and split_part(name, '/', 1) = public.current_company_id()::text
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = public.current_company_id()
      and p.role = 'admin'
  )
);

create policy company_logos_update_admin_same_company
on storage.objects
for update
to authenticated
using (
  bucket_id = 'company-logos'
  and split_part(name, '/', 1) = public.current_company_id()::text
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = public.current_company_id()
      and p.role = 'admin'
  )
)
with check (
  bucket_id = 'company-logos'
  and split_part(name, '/', 1) = public.current_company_id()::text
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = public.current_company_id()
      and p.role = 'admin'
  )
);

create policy company_logos_delete_admin_same_company
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'company-logos'
  and split_part(name, '/', 1) = public.current_company_id()::text
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = public.current_company_id()
      and p.role = 'admin'
  )
);
