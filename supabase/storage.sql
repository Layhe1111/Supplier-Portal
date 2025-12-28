-- Storage setup for Supplier Portal
-- Run this in Supabase SQL Editor after schema.sql to create bucket + policies.

-- Create bucket (private by default)
insert into storage.buckets (id, name, public)
values ('supplier-files', 'supplier-files', false)
on conflict (id) do nothing;

-- Enable RLS on storage objects
alter table storage.objects enable row level security;

-- Idempotent policy setup
drop policy if exists "storage_select_own" on storage.objects;
drop policy if exists "storage_insert_own" on storage.objects;
drop policy if exists "storage_update_own" on storage.objects;
drop policy if exists "storage_delete_own" on storage.objects;

create policy "storage_select_own" on storage.objects
  for select to authenticated using (bucket_id = 'supplier-files' and owner = auth.uid());

create policy "storage_insert_own" on storage.objects
  for insert to authenticated with check (bucket_id = 'supplier-files' and owner = auth.uid());

create policy "storage_update_own" on storage.objects
  for update to authenticated using (bucket_id = 'supplier-files' and owner = auth.uid())
  with check (bucket_id = 'supplier-files' and owner = auth.uid());

create policy "storage_delete_own" on storage.objects
  for delete to authenticated using (bucket_id = 'supplier-files' and owner = auth.uid());
