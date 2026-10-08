-- Projects, reading notes and bibliographies belong to the signed-in client.
-- Run after 024_saved_research_sources.sql. Existing saved readings are preserved.
begin;
create table public.study_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null check (char_length(title) between 1 and 200),
  module text not null default '' check (char_length(module) <= 200),
  deadline date,
  requirements text not null default '' check (char_length(requirements) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create index study_projects_owner_idx on public.study_projects(user_id, created_at desc, id);
alter table public.saved_research_sources
  add column project_id uuid,
  add column reading_status text not null default 'to_read' check (reading_status in ('to_read','reading','read')),
  add column tags text[] not null default '{}' check (cardinality(tags) <= 20 and octet_length(tags::text) <= 4096),
  add column notes text not null default '' check (char_length(notes) <= 10000),
  add column quotation text not null default '' check (char_length(quotation) <= 10000),
  add column page_numbers text not null default '' check (char_length(page_numbers) <= 200),
  add constraint saved_source_project_owner_fk foreign key (project_id, user_id)
    references public.study_projects(id, user_id) on delete set null (project_id);
create index saved_source_project_idx on public.saved_research_sources(user_id, project_id, created_at desc, id desc);
create table public.saved_bibliographies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  project_id uuid,
  title text not null check (char_length(title) between 1 and 200),
  style text not null check (style in ('APA','Harvard','Vancouver','MLA','Chicago')),
  sources jsonb not null check (jsonb_typeof(sources) = 'array' and jsonb_array_length(sources) between 1 and 200 and octet_length(sources::text) <= 1048576),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id, user_id) references public.study_projects(id, user_id) on delete set null (project_id)
);
create index saved_bibliographies_owner_idx on public.saved_bibliographies(user_id, updated_at desc, id);

-- Also maintain timestamps for writes outside the application handlers.
create function public.set_workspace_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger study_projects_updated before update on public.study_projects for each row execute function public.set_workspace_updated_at();
create trigger saved_bibliographies_updated before update on public.saved_bibliographies for each row execute function public.set_workspace_updated_at();

alter table public.study_projects enable row level security;
alter table public.saved_bibliographies enable row level security;
revoke all on public.study_projects, public.saved_bibliographies from anon;
grant select, insert, update, delete on public.study_projects, public.saved_bibliographies to authenticated;
grant all on public.study_projects, public.saved_bibliographies to service_role;
create policy "Own projects" on public.study_projects for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Own bibliographies" on public.saved_bibliographies for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
commit;
