-- Fix the RLS policy for approved reviews to allow both anon and authenticated access
DROP POLICY IF EXISTS 'Anyone can read approved reviews' ON reviews;

CREATE POLICY 'Anyone can read approved reviews'
  ON reviews FOR SELECT
  TO anon, authenticated
  USING (is_approved = true);
