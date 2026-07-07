-- Add country column to orders table for storing customer country
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'United Kingdom';

-- Add academic_level_raw column to store original extracted academic level term
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS academic_level_raw TEXT;

-- Create index for faster country-based queries
CREATE INDEX IF NOT EXISTS idx_orders_country ON orders(country);
