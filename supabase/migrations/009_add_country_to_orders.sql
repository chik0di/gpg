-- Add country column to orders table for storing customer country
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'United Kingdom';

-- Create index for faster country-based queries
CREATE INDEX IF NOT EXISTS idx_orders_country ON orders(country);
