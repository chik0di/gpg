-- Create table for research finder rate limiting
create table if not exists public.research_rate_limits (
  id uuid primary key default gen_random_uuid(),
  ip_address text not null,
  request_count integer not null default 0,
  last_request_at timestamptz not null default now(),
  window_start timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast IP lookups
create index if not exists research_rate_limits_ip_idx on public.research_rate_limits(ip_address);

-- Index for cleanup of old records
create index if not exists research_rate_limits_window_start_idx on public.research_rate_limits(window_start);

-- RLS policies (public table, no user auth needed)
alter table public.research_rate_limits enable row level security;

-- Allow inserts and updates from anyone (API will handle rate limiting logic)
create policy "Allow public insert" on public.research_rate_limits
  for insert to anon, authenticated
  with check (true);

create policy "Allow public update" on public.research_rate_limits
  for update to anon, authenticated
  using (true)
  with check (true);

create policy "Allow public select" on public.research_rate_limits
  for select to anon, authenticated
  using (true);

-- Function to clean up old rate limit records (older than 2 hours)
create or replace function cleanup_old_rate_limits()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.research_rate_limits
  where window_start < now() - interval '2 hours';
end;
$$;

-- Optional: Create a cron job to clean up old records periodically
-- This can be set up in Supabase dashboard or using pg_cron if available
comment on function cleanup_old_rate_limits is 'Cleans up rate limit records older than 2 hours';
