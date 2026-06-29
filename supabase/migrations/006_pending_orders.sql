-- Migration: Add pending_orders table for resilient order-to-checkout flow
-- This table stores incomplete orders before authentication completes,
-- ensuring order data is never lost during auth redirects.

CREATE TABLE IF NOT EXISTS pending_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  order_data JSONB NOT NULL,
  file_data TEXT, -- Base64 encoded file data (nullable)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Index for fast lookup by email and expiry
CREATE INDEX idx_pending_orders_email ON pending_orders(user_email);
CREATE INDEX idx_pending_orders_user_id ON pending_orders(user_id);
CREATE INDEX idx_pending_orders_expires_at ON pending_orders(expires_at);

-- Enable RLS
ALTER TABLE pending_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies:
-- 1. Users can read their own pending orders (matched by email OR user_id)
CREATE POLICY "Users can read own pending orders"
  ON pending_orders
  FOR SELECT
  USING (
    user_email = auth.jwt()->>'email'
    OR user_id = auth.uid()
  );

-- 2. Anyone can insert pending orders (before auth)
CREATE POLICY "Anyone can create pending orders"
  ON pending_orders
  FOR INSERT
  WITH CHECK (true);

-- 3. Users can delete their own pending orders
CREATE POLICY "Users can delete own pending orders"
  ON pending_orders
  FOR DELETE
  USING (
    user_email = auth.jwt()->>'email'
    OR user_id = auth.uid()
  );

-- Add comment for documentation
COMMENT ON TABLE pending_orders IS 'Stores incomplete orders during authentication flow to prevent data loss during OAuth/email redirects. Expires after 24 hours.';
