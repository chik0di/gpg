-- Automatically create a profile row whenever a new user is created in auth.users.
-- SECURITY DEFINER means this runs with the privileges of the function owner (postgres),
-- bypassing RLS entirely. ON CONFLICT DO NOTHING means returning users are safe.
-- This is the authoritative safety net — it fires regardless of client-side code.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'given_name',
    new.raw_user_meta_data->>'family_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
