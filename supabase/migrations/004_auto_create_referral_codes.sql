-- ══════════════════════════════════════════════════════════════════════════
-- AUTO-CREATE REFERRAL CODES FOR NEW USERS
-- ══════════════════════════════════════════════════════════════════════════

-- Function to generate a unique 6-character referral code
create or replace function public.generate_referral_code()
returns text as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Removed confusing chars (0,O,1,I)
  v_code text := '';
  i int;
  max_attempts int := 50;
  attempt int := 0;
begin
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;

    -- Check if code already exists
    if not exists (select 1 from public.referral_codes where code = v_code) then
      return v_code;
    end if;

    attempt := attempt + 1;
    if attempt >= max_attempts then
      raise exception 'Failed to generate unique referral code after % attempts', max_attempts;
    end if;
  end loop;
end;
$$ language plpgsql security definer;


-- Update the handle_new_user function to also create a referral code
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_code text;
begin
  -- Create profile
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'given_name'),
    coalesce(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'family_name')
  )
  on conflict (id) do nothing;

  -- Generate and create referral code
  new_code := public.generate_referral_code();
  insert into public.referral_codes (user_id, code)
  values (new.id, new_code)
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;


-- ══════════════════════════════════════════════════════════════════════════
-- BACKFILL REFERRAL CODES FOR EXISTING USERS
-- ══════════════════════════════════════════════════════════════════════════

-- Create referral codes for any existing users who don't have one
do $$
declare
  user_record record;
  new_code text;
begin
  for user_record in
    select id from auth.users
    where id not in (select user_id from public.referral_codes)
  loop
    new_code := public.generate_referral_code();
    insert into public.referral_codes (user_id, code)
    values (user_record.id, new_code)
    on conflict (user_id) do nothing;
  end loop;
end $$;
