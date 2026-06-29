# Pending Orders System - Migration & Setup Guide

## Overview

This refactoring makes the order-to-checkout flow resilient against auth redirect failures by storing pending orders in a database table instead of relying solely on sessionStorage.

## Changes Made

### 1. Database Schema
- **New table**: `pending_orders` (see `supabase/migrations/006_pending_orders.sql`)
- Stores order data, file data (base64), user email, and expiry (24 hours)
- RLS policies ensure users can only access their own pending orders

### 2. API Endpoints Created
- `POST /api/pending-orders/create` - Save pending order before auth
- `GET /api/pending-orders/[id]` - Retrieve pending order by ID
- `DELETE /api/pending-orders/[id]` - Delete pending order
- `GET /api/pending-orders/check` - Check if user has pending orders
- `GET /api/auth/user` - Get current authenticated user

### 3. Component Updates
- **components/auth/auth-form.tsx** - Saves pending orders before email sign-in/sign-up
- **components/auth/pending-order-saver.tsx** - NEW - Saves pending orders after OAuth
- **components/order/order-form.tsx** - Updated redirect logic
- **components/dashboard/pending-order-banner.tsx** - NEW - Shows recovery banner
- **app/checkout/page.tsx** - Fetches from database first, falls back to sessionStorage
- **app/(client)/dashboard/page.tsx** - Shows pending order banner
- **app/api/orders/create/route.ts** - Cleans up pending orders after order creation

### 4. Flow Changes

#### Email Sign-in/Sign-up
1. User fills order form → clicks "Proceed to Checkout"
2. Redirects to `/login?next=/checkout`
3. User enters email + password
4. **BEFORE authentication**: Order saved to `pending_orders` table
5. After auth: Redirects to `/checkout?pending=ORDER_ID`
6. Checkout page fetches order from database

#### Google OAuth
1. User fills order form → clicks "Proceed to Checkout"
2. Redirects to `/login?next=/checkout`
3. User clicks "Continue with Google"
4. **After Google auth**: User lands on dashboard/checkout
5. `PendingOrderSaver` component detects sessionStorage data
6. Fetches user email, saves to `pending_orders` table
7. Updates URL to include `?pending=ORDER_ID`
8. Checkout page fetches order from database

#### Recovery from Dashboard
1. User lands on dashboard (any reason)
2. `PendingOrderBanner` checks for pending orders via API
3. If found, shows amber banner: "You have an order in progress"
4. Click "Continue to checkout" → `/checkout?pending=ORDER_ID`

---

## Step 1: Run the Database Migration

### Option A: Using Supabase CLI (Local Development)

```bash
# If you have Supabase CLI installed
npx supabase migration up

# Or manually apply the migration
npx supabase db push
```

### Option B: Using Supabase Dashboard (Production)

1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
2. Open `supabase/migrations/006_pending_orders.sql`
3. Copy the entire SQL content
4. Paste into the SQL Editor and click "Run"
5. Verify the table was created:
   ```sql
   SELECT * FROM pending_orders LIMIT 1;
   ```

### Option C: Manual SQL Execution

Connect to your Supabase database and run:

```sql
-- Copy the contents of supabase/migrations/006_pending_orders.sql
-- and execute it directly in your database client
```

---

## Step 2: Verify RLS Policies

After running the migration, verify the Row Level Security policies:

```sql
-- Check that RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'pending_orders';

-- Check policies
SELECT * FROM pg_policies 
WHERE tablename = 'pending_orders';
```

You should see 3 policies:
- "Users can read own pending orders" (SELECT)
- "Anyone can create pending orders" (INSERT)
- "Users can delete own pending orders" (DELETE)

---

## Step 3: Test the System

### Test 1: Email Sign-up with Pending Order

1. **Fill out order form**:
   - Go to http://localhost:3000/order
   - Fill in all fields, upload a test file
   - Click "Proceed to Checkout"

2. **Sign up with email**:
   - Should redirect to `/login?next=/checkout`
   - Click "Create account" tab
   - Enter email, password, first/last name
   - Click "Create account"

3. **Verify order saved**:
   - Check browser console for:
     ```
     [auth-form] Saving pending order to database for: your@email.com
     [auth-form] Saved pending order: <UUID>
     ```

4. **Verify redirect**:
   - Should redirect to `/checkout?pending=<UUID>`
   - Check console for:
     ```
     [checkout] Fetching pending order from database: <UUID>
     [checkout] Successfully loaded order from database
     ```

5. **Verify in database**:
   ```sql
   SELECT id, user_email, created_at, expires_at 
   FROM pending_orders 
   WHERE user_email = 'your@email.com';
   ```

### Test 2: Google OAuth with Pending Order

1. **Fill out order form** (same as Test 1)

2. **Sign in with Google**:
   - Click "Continue with Google"
   - Authenticate with Google
   - Should land on `/dashboard` or `/checkout`

3. **Verify order saved after auth**:
   - Check console for:
     ```
     [pending-order-saver] Saving pending order to database for: google@email.com
     [pending-order-saver] Saved pending order: <UUID>
     ```

4. **Verify database save**:
   ```sql
   SELECT id, user_email, created_at, expires_at 
   FROM pending_orders 
   WHERE user_email = 'google@email.com';
   ```

### Test 3: Dashboard Recovery Banner

1. **Create a pending order** (use either test above)

2. **Navigate away from checkout**:
   - Before completing payment, go to `/dashboard`

3. **Verify banner appears**:
   - Should see amber banner at top of dashboard
   - Text: "You have an order in progress"
   - Click "Continue to checkout" button

4. **Verify redirect**:
   - Should go to `/checkout?pending=<UUID>`
   - Order data should be loaded from database

### Test 4: Order Completion Cleanup

1. **Complete an order** with pending order ID in URL

2. **Verify cleanup**:
   - After payment succeeds and order is created
   - Check console for:
     ```
     [orders/create] cleaned up pending orders for user: <UUID>
     ```

3. **Verify database**:
   ```sql
   SELECT * FROM pending_orders 
   WHERE user_email = 'your@email.com';
   -- Should return 0 rows
   ```

### Test 5: Expiry Handling

1. **Create a pending order**

2. **Manually expire it**:
   ```sql
   UPDATE pending_orders 
   SET expires_at = NOW() - INTERVAL '1 hour' 
   WHERE user_email = 'your@email.com';
   ```

3. **Try to fetch it**:
   - Go to `/checkout?pending=<UUID>`
   - Should show error: "Pending order expired"
   - Order should be deleted from database

---

## Step 4: SMTP Configuration Check

To fix the "Error sending confirmation email" issue:

1. **Go to Supabase Dashboard**:
   - Navigate to: Project Settings → Authentication → Email

2. **Enable Custom SMTP**:
   - Toggle "Enable Custom SMTP Server"

3. **Configure Resend SMTP**:
   ```
   Host: smtp.resend.com
   Port: 465
   Username: resend
   Password: <YOUR_RESEND_API_KEY>
   Sender email: noreply@getprimegrade.com (or your verified domain)
   Sender name: GetPrimeGrade
   ```

4. **Get Resend API Key**:
   - Go to https://resend.com/api-keys
   - Copy your API key
   - Paste as password in Supabase SMTP settings

5. **Test Email**:
   - Try signing up with a new email
   - Should receive confirmation email without errors

---

## Monitoring & Maintenance

### View Pending Orders

```sql
-- All pending orders
SELECT id, user_email, created_at, expires_at,
       (expires_at > NOW()) as is_active
FROM pending_orders
ORDER BY created_at DESC;

-- Count by status
SELECT 
  CASE 
    WHEN expires_at > NOW() THEN 'active'
    ELSE 'expired'
  END as status,
  COUNT(*) as count
FROM pending_orders
GROUP BY status;
```

### Cleanup Expired Orders

```sql
-- Delete expired orders (run this periodically or set up a cron job)
DELETE FROM pending_orders
WHERE expires_at < NOW();
```

### Set up Automatic Cleanup (Optional)

You can use Supabase's pg_cron extension:

```sql
-- Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup at 2 AM
SELECT cron.schedule(
  'cleanup-expired-pending-orders',
  '0 2 * * *',  -- Every day at 2 AM
  $$DELETE FROM pending_orders WHERE expires_at < NOW()$$
);
```

---

## Rollback Plan

If you need to rollback:

```sql
-- Drop the table and all policies
DROP TABLE IF EXISTS pending_orders CASCADE;
```

Then revert the code changes:
```bash
git revert <commit-hash>
```

---

## Success Criteria

✅ **Order data never lost during auth redirects**
✅ **Works with Google OAuth, email instant signup, and email confirmation**
✅ **Dashboard shows recovery banner if user has pending order**
✅ **Checkout page loads from database with fallback to sessionStorage**
✅ **Pending orders cleaned up after successful order creation**
✅ **Expired orders (>24 hours) automatically rejected**
✅ **SMTP emails working without errors**

---

## Troubleshooting

### Issue: "Pending order not found" error

**Cause**: RLS policy blocking access

**Solution**: 
```sql
-- Check if user can read their own orders
SELECT * FROM pending_orders WHERE user_email = auth.jwt()->>'email';

-- If empty, check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'pending_orders';
```

### Issue: Order not saving to database

**Cause**: API endpoint returning 500 error

**Solution**:
- Check server logs for error details
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- Verify table exists: `\dt pending_orders`

### Issue: Dashboard banner not showing

**Cause**: API returning 401 Unauthorized

**Solution**:
- Verify user is authenticated
- Check browser console for errors
- Test endpoint manually: `curl http://localhost:3000/api/pending-orders/check`

---

## Next Steps

1. ✅ Run migration (Step 1)
2. ✅ Verify RLS policies (Step 2)
3. ✅ Test all auth flows (Step 3)
4. ✅ Configure SMTP (Step 4)
5. 📊 Monitor pending orders in production
6. 🔄 Set up automatic cleanup (optional)
