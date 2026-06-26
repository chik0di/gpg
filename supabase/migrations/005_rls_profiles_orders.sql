-- ══════════════════════════════════════════════════════════════════════════
-- RLS POLICIES FOR PROFILES AND ORDERS TABLES
-- ══════════════════════════════════════════════════════════════════════════
-- These tables were created manually in the Supabase dashboard.
-- This migration adds RLS policies to secure them.

-- ── PROFILES TABLE ────────────────────────────────────────────────────────
-- Enable RLS if not already enabled
alter table public.profiles enable row level security;

-- Drop existing policies if they exist (idempotent migration)
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Service role full access to profiles" on public.profiles;

-- Users can read their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile (first_name, last_name only - email is managed by auth)
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Service role can do everything (for admin operations and triggers)
create policy "Service role full access to profiles"
  on public.profiles for all
  using (auth.role() = 'service_role');


-- ── ORDERS TABLE ──────────────────────────────────────────────────────────
-- Enable RLS if not already enabled
alter table public.orders enable row level security;

-- Drop existing policies if they exist (idempotent migration)
drop policy if exists "Users can view own orders" on public.orders;
drop policy if exists "Service role full access to orders" on public.orders;

-- Users can read their own orders
create policy "Users can view own orders"
  on public.orders for select
  using (auth.uid() = user_id);

-- Service role can do everything (for order creation, admin operations)
create policy "Service role full access to orders"
  on public.orders for all
  using (auth.role() = 'service_role');

-- Note: Users do NOT have direct INSERT/UPDATE/DELETE permissions on orders.
-- Order creation happens via API routes using the service role client,
-- which enforces payment verification and business logic before inserting.
