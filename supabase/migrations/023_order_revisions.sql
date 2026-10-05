-- Three revision rounds, with requests accepted within 14 days of first delivery.
begin;

alter table public.orders add column if not exists first_delivered_at timestamptz;

-- Historical delivery dates were not recorded. Use the oldest available completed
-- file timestamp, rather than granting every old order a new window today.
update public.orders o set first_delivered_at = f.delivered_at
from (select order_id, min(created_at) delivered_at from public.order_files
      where file_type = 'completed' group by order_id) f
where o.id = f.order_id and o.status = 'completed' and o.first_delivered_at is null;

create table public.order_revisions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  instructions text not null check (char_length(btrim(instructions)) between 10 and 5000),
  status text not null default 'requested'
    check (status in ('requested', 'in_progress', 'delivered', 'declined', 'cancelled')),
  admin_response text check (char_length(admin_response) <= 5000),
  attachment_path text,
  attachment_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  delivered_at timestamptz,
  check (status <> 'declined' or (admin_response is not null and char_length(btrim(admin_response)) >= 10)),
  check ((status = 'delivered') = (delivered_at is not null))
);
create index order_revisions_order_id_idx on public.order_revisions(order_id, created_at);
create unique index order_revisions_one_active on public.order_revisions(order_id)
  where status in ('requested', 'in_progress');

alter table public.order_files add column revision_id uuid references public.order_revisions(id);
create unique index order_files_one_revision_delivery on public.order_files(revision_id)
  where revision_id is not null;

alter table public.order_revisions enable row level security;
grant select on public.order_revisions to authenticated;
grant all on public.order_revisions to service_role;
create policy "Read own order revisions" on public.order_revisions for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- Record the first actual completion once. Changing status again cannot reset it.
create function public.record_first_order_delivery() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.first_delivered_at is not null then
    new.first_delivered_at := old.first_delivered_at;
  elsif new.status = 'completed' then
    if not exists (select 1 from public.order_files where order_id = new.id and file_type = 'completed') then
      raise exception 'Upload completed work before marking the order completed';
    end if;
    new.first_delivered_at := now();
  end if;
  return new;
end;
$$;
create trigger record_first_order_delivery before update on public.orders
  for each row execute function public.record_first_order_delivery();

-- Lock the parent order for every mutation: concurrent requests and deliveries
-- cannot bypass the allowance, time window or one-active-request rule.
create function public.request_order_revision(
  p_order_id uuid, p_user_id uuid, p_instructions text,
  p_attachment_path text default null, p_attachment_name text default null
) returns public.order_revisions language plpgsql set search_path = public as $$
declare o public.orders; r public.order_revisions;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.user_id <> p_user_id then raise exception 'Order not found'; end if;
  if o.first_delivered_at is null or o.status <> 'completed' then
    raise exception 'Revisions are available after your work is delivered';
  end if;
  if now() >= o.first_delivered_at + interval '14 days' then raise exception 'The revision request window has closed'; end if;
  if (select count(*) from public.order_revisions where order_id = o.id and status = 'delivered') >= 3 then
    raise exception 'All three free revisions have been used';
  end if;
  if exists (select 1 from public.order_revisions where order_id = o.id and status in ('requested', 'in_progress')) then
    raise exception 'An active revision request already exists';
  end if;
  insert into public.order_revisions(order_id, instructions, attachment_path, attachment_name)
    values (o.id, btrim(p_instructions), p_attachment_path, p_attachment_name) returning * into r;
  return r;
end;
$$;

create function public.update_order_revision(
  p_order_id uuid, p_revision_id uuid, p_actor_id uuid, p_admin boolean,
  p_status text, p_response text default null, p_file_path text default null
) returns public.order_revisions language plpgsql set search_path = public as $$
declare o public.orders; r public.order_revisions;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if p_admin then
    if not exists (select 1 from public.profiles where id = p_actor_id and is_admin = true) then
      raise exception 'Forbidden';
    end if;
  elsif o.user_id <> p_actor_id then raise exception 'Forbidden';
  end if;
  select * into r from public.order_revisions where id = p_revision_id and order_id = o.id for update;
  if not found then raise exception 'Revision not found'; end if;
  if not p_admin then
    if p_status <> 'cancelled' or r.status <> 'requested' then raise exception 'Only a request that has not started can be cancelled'; end if;
  elsif p_status = 'in_progress' then
    if r.status <> 'requested' then raise exception 'This request has already been handled'; end if;
  elsif p_status = 'declined' then
    if r.status not in ('requested', 'in_progress') then raise exception 'This request has already been handled'; end if;
  elsif p_status = 'delivered' then
    if r.status <> 'in_progress' then raise exception 'Start the revision before delivering or declining it'; end if;
  else raise exception 'Invalid revision action';
  end if;
  if p_status = 'delivered' then
    if p_file_path is null then raise exception 'Upload revised work before delivering'; end if;
    if (select count(*) from public.order_revisions where order_id = o.id and status = 'delivered') >= 3 then
      raise exception 'All three free revisions have been used';
    end if;
    insert into public.order_files(order_id, file_url, file_type, revision_id)
      values (o.id, p_file_path, 'completed', r.id);
  end if;
  update public.order_revisions set status = p_status,
    admin_response = case when p_admin then nullif(btrim(p_response), '') else admin_response end,
    updated_at = now(), delivered_at = case when p_status = 'delivered' then now() else null end
    where id = r.id returning * into r;
  return r;
end;
$$;

-- Only authenticated API handlers using the service client may mutate revisions.
revoke all on function public.request_order_revision(uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.update_order_revision(uuid, uuid, uuid, boolean, text, text, text) from public, anon, authenticated;
grant execute on function public.request_order_revision(uuid, uuid, text, text, text) to service_role;
grant execute on function public.update_order_revision(uuid, uuid, uuid, boolean, text, text, text) to service_role;
commit;
