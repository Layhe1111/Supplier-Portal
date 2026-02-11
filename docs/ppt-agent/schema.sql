-- docs/ppt-agent/schema.sql
-- -----------------------------------------------------------------------------
-- Supabase SQL for Hidden PPT Agent job queue
-- -----------------------------------------------------------------------------

-- 1) Enable extension for UUID generator if not already enabled.
create extension if not exists pgcrypto;

-- 2) Create table for PPT jobs.
create table if not exists public.ppt_jobs (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('pending','running','done','failed')),
  progress int not null default 0 check (progress >= 0 and progress <= 100),
  prompt text not null,
  input_json jsonb not null,
  slide_spec jsonb,
  file_path text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helpful queue index for worker scans.
create index if not exists idx_ppt_jobs_status_created_at on public.ppt_jobs(status, created_at);

-- 3) Keep updated_at fresh via trigger.
create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ppt_jobs_set_updated_at on public.ppt_jobs;
create trigger trg_ppt_jobs_set_updated_at
before update on public.ppt_jobs
for each row
execute procedure public.set_updated_at_timestamp();
