-- Add column to track orders outside standard subject areas
-- Migration 010: Add is_outside_standard_fields to orders table

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS is_outside_standard_fields BOOLEAN DEFAULT false;

-- Add index for filtering by this field in admin dashboard
CREATE INDEX IF NOT EXISTS idx_orders_outside_standard_fields
ON orders(is_outside_standard_fields)
WHERE is_outside_standard_fields = true;

-- Add comment explaining the column
COMMENT ON COLUMN orders.is_outside_standard_fields IS
'True if the subject field is outside our standard predefined list (Computer Science, IT, Business, etc). Requires manual review before work begins.';
