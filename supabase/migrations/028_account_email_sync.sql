-- Keep delivery addresses in sync with confirmed Auth email changes.
-- Security notifications use these server-recorded changes, never browser-supplied addresses.
BEGIN;

CREATE TABLE IF NOT EXISTS public.account_email_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_email text NOT NULL,
  new_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  notification_claimed_at timestamptz,
  notification_sent_at timestamptz
);
CREATE INDEX IF NOT EXISTS account_email_changes_user_created
  ON public.account_email_changes (user_id, created_at DESC);
ALTER TABLE public.account_email_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_email_changes FROM anon, authenticated;
GRANT ALL ON public.account_email_changes TO service_role;

CREATE OR REPLACE FUNCTION public.handle_account_email_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id;
  IF OLD.email IS NOT NULL AND NEW.email IS NOT NULL
    AND lower(OLD.email) IS DISTINCT FROM lower(NEW.email) THEN
    INSERT INTO public.account_email_changes (user_id, old_email, new_email)
    VALUES (NEW.id, OLD.email, NEW.email);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_account_email_change() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;
CREATE TRIGGER on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.handle_account_email_change();

-- Repair existing delivery addresses without generating historical notifications.
UPDATE public.profiles p SET email = u.email
FROM auth.users u WHERE p.id = u.id AND p.email IS DISTINCT FROM u.email;

COMMIT;
