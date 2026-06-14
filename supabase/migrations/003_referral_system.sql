-- ══════════════════════════════════════════════════════════════════════════
-- REFERRAL SYSTEM
-- ══════════════════════════════════════════════════════════════════════════

-- ── referral_codes ─────────────────────────────────────────────────────────
-- One unique code per user, generated on account creation
-- Format: 6-character alphanumeric code (e.g. ABC123, XYZ789)

create table if not exists public.referral_codes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users(id) on delete cascade,
  code       text not null unique check (length(code) = 6),
  created_at timestamptz default now()
);

-- Create index for fast code lookups
create index idx_referral_codes_code on public.referral_codes(code);
create index idx_referral_codes_user_id on public.referral_codes(user_id);

alter table public.referral_codes enable row level security;

-- Users can read their own referral code
create policy "Users read own referral code"
  on public.referral_codes for select
  using (auth.uid() = user_id);

-- Service role can do everything
create policy "Service role full access to referral codes"
  on public.referral_codes for all
  using (auth.role() = 'service_role');


-- ── referrals ──────────────────────────────────────────────────────────────
-- Tracks each referral relationship
-- status: pending (signed up but no order) | completed (first order placed)

create table if not exists public.referrals (
  id             uuid primary key default gen_random_uuid(),
  referrer_id    uuid not null references auth.users(id) on delete cascade,
  referred_id    uuid not null references auth.users(id) on delete cascade,
  status         text not null default 'pending' check (status in ('pending', 'completed')),
  credit_applied boolean not null default false,
  created_at     timestamptz default now(),

  -- Ensure one user can't be referred multiple times
  unique(referred_id),

  -- Prevent self-referral at DB level
  check (referrer_id != referred_id)
);

create index idx_referrals_referrer_id on public.referrals(referrer_id);
create index idx_referrals_referred_id on public.referrals(referred_id);
create index idx_referrals_status on public.referrals(status);

alter table public.referrals enable row level security;

-- Referrers can read their own referrals
create policy "Users read referrals they created"
  on public.referrals for select
  using (auth.uid() = referrer_id);

-- Service role can do everything
create policy "Service role full access to referrals"
  on public.referrals for all
  using (auth.role() = 'service_role');


-- ── referral_credits ───────────────────────────────────────────────────────
-- Tracks referral discount credits
-- Each credit is 10% off one order, expires 90 days after issue

create table if not exists public.referral_credits (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  referral_id  uuid not null references public.referrals(id) on delete cascade,
  amount       numeric(10, 2) not null default 0, -- Can store actual £ amount or 0 for percentage-based
  is_used      boolean not null default false,
  expires_at   timestamptz not null,
  used_at      timestamptz,
  created_at   timestamptz default now()
);

create index idx_referral_credits_user_id on public.referral_credits(user_id);
create index idx_referral_credits_is_used on public.referral_credits(is_used);
create index idx_referral_credits_expires_at on public.referral_credits(expires_at);

alter table public.referral_credits enable row level security;

-- Users can read their own credits
create policy "Users read own referral credits"
  on public.referral_credits for select
  using (auth.uid() = user_id);

-- Service role can do everything
create policy "Service role full access to referral credits"
  on public.referral_credits for all
  using (auth.role() = 'service_role');
