-- Add admin role to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Set the admin user (update the email to match your admin account)
UPDATE profiles SET is_admin = true
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'admin@getprimegrade.com'
);

-- Create index for admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_admin ON profiles(is_admin) WHERE is_admin = true;
