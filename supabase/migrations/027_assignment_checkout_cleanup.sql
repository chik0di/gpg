-- Retire the former rewards system without affecting profiles or paid orders.
-- Run the whole migration as one transaction. The retired reward records are deleted.
BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_first_name text;
  v_last_name text;
  v_full_name text;
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


DROP TABLE IF EXISTS public.referral_credits;
DROP TABLE IF EXISTS public.referrals;
DROP TABLE IF EXISTS public.referral_codes;
DROP FUNCTION IF EXISTS public.generate_referral_code();

-- Checkout snapshots are created only by authenticated server handlers.
DROP POLICY IF EXISTS "Anyone can create pending orders" ON public.pending_orders;

COMMIT;
