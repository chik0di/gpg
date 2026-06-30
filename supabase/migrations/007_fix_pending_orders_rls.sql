-- Migration: Fix pending_orders RLS policy for case-insensitive email matching
-- This ensures that email case differences don't block access to pending orders

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own pending orders" ON pending_orders;
DROP POLICY IF EXISTS "Users can delete own pending orders" ON pending_orders;

-- Recreate read policy with case-insensitive email comparison
CREATE POLICY "Users can read own pending orders"
  ON pending_orders
  FOR SELECT
  USING (
    LOWER(user_email) = LOWER(auth.jwt()->>'email')
    OR user_id = auth.uid()
  );

-- Recreate delete policy with case-insensitive email comparison
CREATE POLICY "Users can delete own pending orders"
  ON pending_orders
  FOR DELETE
  USING (
    LOWER(user_email) = LOWER(auth.jwt()->>'email')
    OR user_id = auth.uid()
  );

-- Add comment explaining the case-insensitive comparison
COMMENT ON POLICY "Users can read own pending orders" ON pending_orders IS
  'Allows users to read their own pending orders by matching email (case-insensitive) or user_id. Case-insensitive matching prevents mismatches due to email casing differences.';
