-- ============================================================================
-- Migration 021: Prevent Reviews RLS Regression
-- ============================================================================
-- CRITICAL: This migration fixes a recurring bug where approved reviews
-- become invisible on /reviews and the landing page.
--
-- BUG HISTORY:
-- - This is the THIRD time this bug has occurred
-- - Approved reviews (is_approved=true) exist in database
-- - But they don't appear on /reviews or landing page review carousel
-- - Root cause: RLS policy for anonymous access keeps getting lost
--
-- ROOT CAUSE:
-- The policy "Anyone can read approved reviews" is ESSENTIAL for public pages.
-- Without it, anonymous (non-logged-in) visitors cannot see approved reviews.
-- This policy has been lost multiple times, possibly due to:
-- 1. Later migrations accidentally dropping it
-- 2. Policy conflicts causing PostgreSQL to silently disable it
-- 3. Missing table grants (anon role needs SELECT permission)
--
-- PREVENTION:
-- This migration ensures the policy exists and is correctly configured.
-- It also adds safeguards and comments to prevent future regressions.
-- ============================================================================

-- Drop and recreate the critical policy
-- Using IF EXISTS to make this migration idempotent
DROP POLICY IF EXISTS 'Anyone can read approved reviews' ON reviews;

-- CRITICAL POLICY - DO NOT REMOVE!
-- This policy allows anonymous users to read approved reviews.
-- Used by:
-- - /reviews page (public, no authentication required)
-- - Landing page review carousel (public section)
-- - Any public-facing review display
--
-- Without this policy, approved reviews are INVISIBLE to anonymous users!
CREATE POLICY 'Anyone can read approved reviews'
  ON reviews FOR SELECT
  TO anon, authenticated
  USING (is_approved = true);

-- Ensure table grants are in place
-- The policy alone is not enough - the role must have SELECT permission
GRANT SELECT ON reviews TO anon;
GRANT SELECT ON reviews TO authenticated;

-- Add a comment on the policy for documentation
COMMENT ON POLICY 'Anyone can read approved reviews' ON reviews IS
'CRITICAL: Allows anonymous users to view approved reviews on public pages (/reviews, landing page). DO NOT DROP THIS POLICY. If reviews stop appearing on public pages, check this policy first.';

-- Add a comment on the table explaining RLS requirements
COMMENT ON TABLE reviews IS
'Reviews table with RLS enabled. CRITICAL: Must have "Anyone can read approved reviews" policy for anon role, otherwise approved reviews will not appear on public pages.';

-- ============================================================================
-- Verification query (for manual testing after migration)
-- ============================================================================
-- Run this as anon to verify approved reviews are visible:
--
-- SET ROLE anon;
-- SELECT id, rating, review_text, is_approved
-- FROM reviews
-- WHERE is_approved = true
-- LIMIT 5;
-- RESET ROLE;
--
-- If this returns NO ROWS but approved reviews exist, the policy is broken!
-- ============================================================================
