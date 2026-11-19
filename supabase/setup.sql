insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pattern-trading-backups',
  'pattern-trading-backups',
  false,
  52428800,
  array['application/zip']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users read their own pattern backups" on storage.objects;
create policy "Users read their own pattern backups"
on storage.objects for select to authenticated
using (
  bucket_id = 'pattern-trading-backups'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users upload their own pattern backups" on storage.objects;
create policy "Users upload their own pattern backups"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'pattern-trading-backups'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users update their own pattern backups" on storage.objects;
create policy "Users update their own pattern backups"
on storage.objects for update to authenticated
using (
  bucket_id = 'pattern-trading-backups'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'pattern-trading-backups'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
