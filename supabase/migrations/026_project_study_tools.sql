-- Run after 025_study_workspace.sql. Planner, comparison notes and outlines.
begin;
create table public.project_study_tools (
  project_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  content jsonb not null check (
    jsonb_typeof(content) = 'object' and content ?& array['tasks', 'matrix', 'outline', 'word_target']
    and jsonb_typeof(content->'word_target') = 'number' and octet_length(content::text) <= 2097152
    and jsonb_typeof(content->'tasks') = 'array' and jsonb_array_length(content->'tasks') <= 100
    and jsonb_typeof(content->'matrix') = 'array' and jsonb_array_length(content->'matrix') <= 200
    and jsonb_typeof(content->'outline') = 'array' and jsonb_array_length(content->'outline') <= 100
  ),
  updated_at timestamptz not null default now(),
  foreign key (project_id, user_id) references public.study_projects(id, user_id) on delete cascade
);
create index project_study_tools_owner_idx on public.project_study_tools(user_id);
create trigger project_study_tools_updated before update on public.project_study_tools
  for each row execute function public.set_workspace_updated_at();
alter table public.project_study_tools enable row level security;
revoke all on public.project_study_tools from anon;
grant select, insert, update, delete on public.project_study_tools to authenticated;
grant all on public.project_study_tools to service_role;
create policy "Own project tools" on public.project_study_tools for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
commit;