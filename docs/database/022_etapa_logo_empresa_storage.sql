-- Logo da empresa: bucket publico + policies por empresa

-- 1) Bucket publico "company-logos" (2 MB, so png/jpeg/webp, sem SVG)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-logos',
  'company-logos',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- 2) Limpa policies antigas (se existirem)
drop policy if exists company_logos_select_public on storage.objects;
drop policy if exists company_logos_insert_admin_same_company on storage.objects;
drop policy if exists company_logos_update_admin_same_company on storage.objects;
drop policy if exists company_logos_delete_admin_same_company on storage.objects;

-- 3) Leitura publica das logos
create policy company_logos_select_public
on storage.objects
for select
to public
using (bucket_id = 'company-logos');

-- 4) Somente admin da empresa grava na propria pasta ({company_id}/arquivo)
create policy company_logos_insert_admin_same_company
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'company-logos'
  and (storage.foldername(name))[1] = public.current_company_id()::text
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
  and (storage.foldername(name))[1] = public.current_company_id()::text
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
  and (storage.foldername(name))[1] = public.current_company_id()::text
);

create policy company_logos_delete_admin_same_company
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'company-logos'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = public.current_company_id()
      and p.role = 'admin'
  )
);