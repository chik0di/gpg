-- ── deliverables ──────────────────────────────────────────────────────────
-- One row per deliverable item on an order.
-- Prices are base GBP (before academic-level / deadline multipliers).

create table if not exists public.deliverables (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  type       text not null check (type in ('written', 'presentation', 'practical')),
  subtype    text,        -- practical: category key  |  presentation: slide-band key
  size_band  text,        -- written: page count as text  |  others: null
  price      numeric(10, 2) not null,
  created_at timestamptz default now()
);

alter table public.deliverables enable row level security;

-- Clients can read their own deliverables
create policy "Clients read own deliverables"
  on public.deliverables for select
  using (
    auth.uid() = (
      select user_id from public.orders where id = order_id
    )
  );

-- Service role (API routes using supabase-js server client) can do everything
create policy "Service role full access to deliverables"
  on public.deliverables for all
  using (auth.role() = 'service_role');


-- ── order_files ────────────────────────────────────────────────────────────
-- Stores URLs of files attached to an order.
-- file_type = 'assignment'  → uploaded by the client when placing the order
-- file_type = 'completed'   → uploaded by admin when marking an order complete

create table if not exists public.order_files (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  file_url   text not null,
  file_type  text not null check (file_type in ('assignment', 'completed')),
  created_at timestamptz default now()
);

alter table public.order_files enable row level security;

-- Clients can read files on their own orders
create policy "Clients read own order files"
  on public.order_files for select
  using (
    auth.uid() = (
      select user_id from public.orders where id = order_id
    )
  );

create policy "Service role full access to order files"
  on public.order_files for all
  using (auth.role() = 'service_role');


-- ── orders — add stripe_payment_intent_id if not present ─────────────────
-- Run only if the column doesn't already exist
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'orders'
      and column_name  = 'stripe_payment_intent_id'
  ) then
    alter table public.orders add column stripe_payment_intent_id text unique;
  end if;
end $$;
