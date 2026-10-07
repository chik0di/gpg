-- Account-owned reading lists. Store metadata and links, never PDF uploads.
begin;

create table public.saved_research_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  source_key text not null check (char_length(source_key) between 1 and 2050),
  source_data jsonb not null check (jsonb_typeof(source_data) = 'object' and octet_length(source_data::text) <= 131072),
  created_at timestamptz not null default now(),
  unique (user_id, source_key)
);
create index saved_research_sources_user_created_idx
  on public.saved_research_sources(user_id, created_at desc, id desc);

alter table public.saved_research_sources enable row level security;
revoke all on public.saved_research_sources from anon;
grant select, insert, update, delete on public.saved_research_sources to authenticated;
grant all on public.saved_research_sources to service_role;

create policy "Read own saved sources" on public.saved_research_sources
  for select to authenticated using (user_id = auth.uid());
create policy "Save own sources" on public.saved_research_sources
  for insert to authenticated with check (user_id = auth.uid());
create policy "Update own saved sources" on public.saved_research_sources
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Remove own saved sources" on public.saved_research_sources
  for delete to authenticated using (user_id = auth.uid());

commit;
