-- Migration 011: Add pricing snapshot and integer pence columns
-- Ensures pricing calculations are preserved at order creation time
-- and stored in integer pence to avoid floating-point errors

-- Add pricing snapshot to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pricing_snapshot JSONB;

COMMENT ON COLUMN orders.pricing_snapshot IS
'Snapshot of pricing rates at order creation time. Preserves historical pricing even if rates change.
Structure: {
  "written_rate_pence": 500,
  "slide_rate_pence": 250,
  "technical_simple_pence": 4000,
  "technical_moderate_pence": 6500,
  "technical_complex_pence": 9500,
  "technical_expert_pence": 13000,
  "academic_multipliers": {"College": 80, "Undergraduate": 100, "Masters": 130},
  "deadline_multipliers": {"2-3d": 180, "4-6d": 150, "7-13d": 120, "14+d": 100},
  "originality_report_pence": 800,
  "calculated_at": "2026-07-13T10:30:00.000Z"
}';

-- Add integer pence column to deliverables table for exact pricing
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS price_pence INTEGER;

COMMENT ON COLUMN deliverables.price_pence IS
'Exact price in integer pence (e.g., 4500 = £45.00).
Avoids floating-point rounding errors.
This is the authoritative price field - the price column in pounds is for backward compatibility.';

-- Create index for querying pricing snapshots
CREATE INDEX IF NOT EXISTS idx_orders_pricing_snapshot ON orders USING GIN (pricing_snapshot);

-- Backfill price_pence from existing price column (convert pounds to pence)
-- This is safe because it runs once and only updates NULL values
UPDATE deliverables
SET price_pence = ROUND(price * 100)
WHERE price_pence IS NULL AND price IS NOT NULL;
