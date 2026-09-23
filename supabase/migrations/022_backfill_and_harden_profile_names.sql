-- ============================================================================
-- Migration 022: Backfill and Harden Profile Name Extraction
-- ============================================================================
-- FIXES:
-- 1. Existing profiles with NULL first_name despite having name metadata
-- 2. Existing profiles with trailing/leading whitespace or capitalization issues
-- 3. Trigger that doesn't handle single 'name' or 'full_name' fields
--
-- BACKFILLS:
-- - User 80dbc0da-d388-4ddf-8c94-d68d12227cfa: {'name': 'Chig'} → first_name: 'Chig'
-- - Profiles with trailing whitespace: 'Sammy ' → 'Sammy'
-- - Profiles with lowercase names: 'june' → 'June'
-- ============================================================================

-- ============================================================================
-- PART 1: Create trigger error log table (if not exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trigger_error_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_name text NOT NULL,
  user_id uuid,
  error_message text,
  error_detail text,
  raw_metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trigger_error_log ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own errors
CREATE POLICY IF NOT EXISTS "Users can read their own trigger errors"
  ON public.trigger_error_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Grant admin full access
CREATE POLICY IF NOT EXISTS "Admins can read all trigger errors"
  ON public.trigger_error_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- PART 2: Helper function to capitalize first letter of a word
-- ============================================================================
CREATE OR REPLACE FUNCTION public.capitalize_first_letter(input_text text)
RETURNS text AS $$
BEGIN
  IF input_text IS NULL OR input_text = '' THEN
    RETURN input_text;
  END IF;
  RETURN upper(substring(input_text from 1 for 1)) || lower(substring(input_text from 2));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- PART 3: Backfill existing profiles with missing or poorly formatted names
-- ============================================================================

-- Step 1: Update NULL first_name/last_name from metadata
WITH name_extraction AS (
  SELECT
    p.id,
    -- Extract first name
    TRIM(
      capitalize_first_letter(
        COALESCE(
          u.raw_user_meta_data->>'first_name',
          u.raw_user_meta_data->>'given_name',
          -- Split 'name' or 'full_name' on first space
          CASE
            WHEN u.raw_user_meta_data->>'name' IS NOT NULL THEN
              split_part(u.raw_user_meta_data->>'name', ' ', 1)
            WHEN u.raw_user_meta_data->>'full_name' IS NOT NULL THEN
              split_part(u.raw_user_meta_data->>'full_name', ' ', 1)
            ELSE NULL
          END
        )
      )
    ) as extracted_first_name,
    -- Extract last name
    TRIM(
      capitalize_first_letter(
        COALESCE(
          u.raw_user_meta_data->>'last_name',
          u.raw_user_meta_data->>'family_name',
          -- Get everything after first space in 'name' or 'full_name'
          CASE
            WHEN u.raw_user_meta_data->>'name' IS NOT NULL AND
                 position(' ' in u.raw_user_meta_data->>'name') > 0 THEN
              substring(u.raw_user_meta_data->>'name' from position(' ' in u.raw_user_meta_data->>'name') + 1)
            WHEN u.raw_user_meta_data->>'full_name' IS NOT NULL AND
                 position(' ' in u.raw_user_meta_data->>'full_name') > 0 THEN
              substring(u.raw_user_meta_data->>'full_name' from position(' ' in u.raw_user_meta_data->>'full_name') + 1)
            ELSE NULL
          END
        )
      )
    ) as extracted_last_name
  FROM profiles p
  INNER JOIN auth.users u ON p.id = u.id
  WHERE p.first_name IS NULL OR p.last_name IS NULL
)
UPDATE profiles p
SET
  first_name = CASE
    WHEN p.first_name IS NULL AND n.extracted_first_name IS NOT NULL AND n.extracted_first_name != ''
    THEN n.extracted_first_name
    ELSE p.first_name
  END,
  last_name = CASE
    WHEN p.last_name IS NULL AND n.extracted_last_name IS NOT NULL AND n.extracted_last_name != ''
    THEN n.extracted_last_name
    ELSE p.last_name
  END,
  updated_at = now()
FROM name_extraction n
WHERE p.id = n.id
  AND (
    (p.first_name IS NULL AND n.extracted_first_name IS NOT NULL AND n.extracted_first_name != '') OR
    (p.last_name IS NULL AND n.extracted_last_name IS NOT NULL AND n.extracted_last_name != '')
  );

-- Step 2: Trim whitespace and capitalize ALL existing profiles (even non-NULL)
UPDATE profiles
SET
  first_name = CASE
    WHEN first_name IS NOT NULL THEN
      capitalize_first_letter(TRIM(first_name))
    ELSE NULL
  END,
  last_name = CASE
    WHEN last_name IS NOT NULL THEN
      capitalize_first_letter(TRIM(last_name))
    ELSE NULL
  END,
  updated_at = now()
WHERE
  -- Only update rows that need it (has whitespace or wrong capitalization)
  (first_name IS NOT NULL AND (first_name != TRIM(first_name) OR first_name != capitalize_first_letter(TRIM(first_name)))) OR
  (last_name IS NOT NULL AND (last_name != TRIM(last_name) OR last_name != capitalize_first_letter(TRIM(last_name))));

-- ============================================================================
-- PART 4: Hardened trigger function for future signups
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_first_name text;
  v_last_name text;
  v_full_name text;
  new_code text;
BEGIN
  -- Try to extract first name from metadata with comprehensive fallback
  -- Priority: first_name > given_name > split name > split full_name
  v_first_name := COALESCE(
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'given_name',
    CASE
      WHEN new.raw_user_meta_data->>'name' IS NOT NULL THEN
        split_part(new.raw_user_meta_data->>'name', ' ', 1)
      WHEN new.raw_user_meta_data->>'full_name' IS NOT NULL THEN
        split_part(new.raw_user_meta_data->>'full_name', ' ', 1)
      ELSE NULL
    END
  );

  -- Try to extract last name from metadata with comprehensive fallback
  -- Priority: last_name > family_name > split name > split full_name
  v_last_name := COALESCE(
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'family_name',
    CASE
      WHEN new.raw_user_meta_data->>'name' IS NOT NULL AND
           position(' ' in new.raw_user_meta_data->>'name') > 0 THEN
        substring(new.raw_user_meta_data->>'name' from position(' ' in new.raw_user_meta_data->>'name') + 1)
      WHEN new.raw_user_meta_data->>'full_name' IS NOT NULL AND
           position(' ' in new.raw_user_meta_data->>'full_name') > 0 THEN
        substring(new.raw_user_meta_data->>'full_name' from position(' ' in new.raw_user_meta_data->>'full_name') + 1)
      ELSE NULL
    END
  );

  -- Trim whitespace and capitalize first letter
  IF v_first_name IS NOT NULL THEN
    v_first_name := public.capitalize_first_letter(TRIM(v_first_name));
  END IF;

  IF v_last_name IS NOT NULL THEN
    v_last_name := public.capitalize_first_letter(TRIM(v_last_name));
  END IF;

  -- Attempt to create profile with error handling
  BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name)
    VALUES (
      new.id,
      new.email,
      v_first_name,
      v_last_name
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't fail user creation
      INSERT INTO public.trigger_error_log (
        trigger_name,
        user_id,
        error_message,
        error_detail,
        raw_metadata
      )
      VALUES (
        'handle_new_user - profile insert',
        new.id,
        SQLERRM,
        SQLSTATE,
        new.raw_user_meta_data
      );
  END;

  -- Attempt to generate and create referral code
  BEGIN
    new_code := public.generate_referral_code();
    INSERT INTO public.referral_codes (user_id, code)
    VALUES (new.id, new_code)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't fail user creation
      INSERT INTO public.trigger_error_log (
        trigger_name,
        user_id,
        error_message,
        error_detail,
        raw_metadata
      )
      VALUES (
        'handle_new_user - referral code insert',
        new.id,
        SQLERRM,
        SQLSTATE,
        new.raw_user_meta_data
      );
  END;

  -- Always return new to allow user creation to proceed
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists (DROP and recreate to guarantee latest version)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- VERIFICATION QUERIES (commented out - run manually to verify)
-- ============================================================================

-- Check specific user 80dbc0da-d388-4ddf-8c94-d68d12227cfa after backfill
-- SELECT
--   p.id,
--   p.email,
--   p.first_name as profile_first_name,
--   p.last_name as profile_last_name,
--   u.raw_user_meta_data->>'name' as metadata_name,
--   u.raw_user_meta_data->>'full_name' as metadata_full_name,
--   u.raw_user_meta_data->>'given_name' as metadata_given_name,
--   p.updated_at
-- FROM profiles p
-- INNER JOIN auth.users u ON p.id = u.id
-- WHERE p.id = '80dbc0da-d388-4ddf-8c94-d68d12227cfa';

-- Check all recently updated profiles
-- SELECT
--   id,
--   email,
--   first_name,
--   last_name,
--   updated_at
-- FROM profiles
-- WHERE updated_at > now() - interval '5 minutes'
-- ORDER BY updated_at DESC;

-- Check for any remaining NULL first_name profiles
-- SELECT
--   p.id,
--   p.email,
--   p.first_name,
--   p.last_name,
--   u.raw_user_meta_data
-- FROM profiles p
-- INNER JOIN auth.users u ON p.id = u.id
-- WHERE p.first_name IS NULL
-- ORDER BY p.created_at DESC;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- CHANGES APPLIED:
-- 1. Created trigger_error_log table for error tracking
-- 2. Created capitalize_first_letter helper function
-- 3. Backfilled NULL first_name/last_name from name/full_name metadata
-- 4. Trimmed whitespace and capitalized all existing names
-- 5. Updated handle_new_user trigger to:
--    - Try name/full_name fields with splitting
--    - Trim and capitalize all extracted names
--    - Log errors instead of failing silently
--    - Never block user account creation
--
-- EXPECTED RESULTS:
-- - User 80dbc0da-d388-4ddf-8c94-d68d12227cfa: first_name = 'Chig'
-- - 'Sammy ' → 'Sammy'
-- - 'Chelsea ' → 'Chelsea'
-- - 'june' → 'June'
-- - Future signups with single 'name' field: properly extracted and capitalized
-- ============================================================================
