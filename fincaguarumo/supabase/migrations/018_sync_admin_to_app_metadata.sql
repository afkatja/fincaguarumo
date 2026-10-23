-- Migration 018: Sync is_admin to auth.users.raw_app_meta_data.role
-- This enables zero-DB admin checks via JWT raw_app_meta_data

-- Function to sync public.users.is_admin to auth.users.raw_app_meta_data.role
CREATE OR REPLACE FUNCTION public.sync_user_raw_app_meta_data_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Get admin status from public.users (NEW is available in trigger)
  SELECT is_admin INTO v_is_admin
  FROM public.users
  WHERE id = NEW.id;

  -- If user not found in public.users, default to false
  IF v_is_admin IS NULL THEN
    v_is_admin := FALSE;
  END IF;

  -- Update auth.users.raw_app_meta_data with role
  -- role: 'admin' if is_admin, otherwise 'user' (or null to omit)
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    CASE WHEN v_is_admin THEN '"admin"'::jsonb ELSE '"user"'::jsonb END
  )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.sync_user_raw_app_meta_data_role() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.sync_user_raw_app_meta_data_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_user_raw_app_meta_data_role() TO postgres;
GRANT EXECUTE ON FUNCTION public.sync_user_raw_app_meta_data_role() TO supabase_auth_admin;

-- Standalone function for manual sync (used by backfill)
CREATE OR REPLACE FUNCTION public.sync_user_raw_app_meta_data_role_manual(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT is_admin INTO v_is_admin
  FROM public.users
  WHERE id = user_id;

  IF v_is_admin IS NULL THEN
    v_is_admin := FALSE;
  END IF;

  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    CASE WHEN v_is_admin THEN '"admin"'::jsonb ELSE '"user"'::jsonb END
  )
  WHERE id = user_id;
END;
$$;

ALTER FUNCTION public.sync_user_raw_app_meta_data_role_manual(UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.sync_user_raw_app_meta_data_role_manual(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_user_raw_app_meta_data_role_manual(UUID) TO postgres;
GRANT EXECUTE ON FUNCTION public.sync_user_raw_app_meta_data_role_manual(UUID) TO supabase_auth_admin;

-- Trigger on public.users to sync raw_app_meta_data when is_admin changes
DROP TRIGGER IF EXISTS on_users_admin_change ON public.users;
CREATE TRIGGER on_users_admin_change
  AFTER UPDATE OF is_admin ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_raw_app_meta_data_role();

-- Also update the existing handle_new_user to sync raw_app_meta_data on user creation
-- We need to update the function to also call sync_user_raw_app_meta_data_role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
BEGIN
  INSERT INTO public.users (id, email, is_admin, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    FALSE,
    COALESCE(NEW.created_at, NOW()),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email       = COALESCE(EXCLUDED.email, public.users.email),
    updated_at  = NOW()
  WHERE public.users.email IS NULL
     OR public.users.email IS DISTINCT FROM EXCLUDED.email;

  -- Sync raw_app_meta_data for new user (defaults to 'user' role)
  PERFORM public.sync_user_raw_app_meta_data_role_manual(NEW.id);

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

-- Backfill: sync raw_app_meta_data for all existing users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM public.users LOOP
    PERFORM public.sync_user_raw_app_meta_data_role_manual(user_record.id);
  END LOOP;
END;
$$;