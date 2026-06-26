# Migration Instructions - Auto-Create Referral Codes

## Problem
The ReferralSection component is not appearing on the client dashboard because users don't have referral codes automatically created when they sign up.

## Solution
A new migration file has been created: `supabase/migrations/004_auto_create_referral_codes.sql`

This migration:
1. Creates a `generate_referral_code()` function that generates unique 6-character codes
2. Updates the `handle_new_user()` trigger to automatically create referral codes for new users
3. Backfills referral codes for all existing users who don't have one

## How to Apply the Migration

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard at: https://supabase.com/dashboard/project/cqfadjsenehnwlbfpeve
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the entire content of `supabase/migrations/004_auto_create_referral_codes.sql`
5. Click **Run** to execute the migration
6. Verify success by checking the **Table Editor** → `referral_codes` table - you should see entries for all users

### Option 2: Using Supabase CLI
If you have the Supabase CLI installed:
```bash
supabase db push
```

### Option 3: Manual SQL Execution
1. Log into your Supabase project
2. Go to SQL Editor
3. Run the migration SQL directly

## Verification
After applying the migration:
1. Check that all existing users have a referral code in the `referral_codes` table
2. Create a new test user account
3. Verify the new user automatically gets a referral code
4. Log in with any user and navigate to `/dashboard`
5. The "Refer a Friend" section should now be visible below the stats cards

## Files Changed
- ✅ `/supabase/migrations/004_auto_create_referral_codes.sql` - New migration file
- ✅ `/components/dashboard/referral-section.tsx` - Already exists and works correctly
- ✅ `/app/(client)/dashboard/page.tsx` - Already imports and renders ReferralSection

No code changes needed - just apply the migration!
