-- Migration 015: Harden public.handle_new_user trigger and add auth/users diagnostic view
--
-- The existing trigger in 007_add_admin_users_and_restrict_rls.sql has two
-- known failure modes that result in "no record is added in supabase table":
--
--   1. SECURITY DEFINER functions run with an empty search_path by default on
--      modern PostgreSQL/Supabase. A bare `INSERT INTO public.users`
--      technically still qualifies with a schema prefix, but calls to helpers
--      inside the function (e.g. nextval sequences, NOW() in timestamptz
--      casting) fail silently when pg_catalog isn't on search_path.
--   2. There is no ON CONFLICT clause, so if a row in public.users already
--      exists (e.g. created by an initial backfill script, or the trigger
--      fires twice in an idempotent retry) the INSERT fails and the whole
--      transaction rolls back.
--
-- This migration replaces the function with a hardened version and rebuilds
-- the trigger. It also creates a diagnostic SQL view that makes it trivial
-- to see which auth.users rows are missing from public.users (for debugging).

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

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill any auth.users rows that slipped through while the trigger was
-- broken or not yet applied. ON CONFLICT keeps this safe to re-run.
INSERT INTO public.users (id, email, is_admin, created_at, updated_at)
SELECT
  a.id,
  a.email,
  FALSE,
  COALESCE(a.created_at, NOW()),
  NOW()
FROM auth.users a
LEFT JOIN public.users u ON u.id = a.id
WHERE u.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Diagnostic view: list every auth.user with the matched (or missing)
-- public.users row and an is_missing / is_admin_mismatch flag so we can
-- query this from the dashboard instead of joining manually.
CREATE OR REPLACE VIEW public.auth_users_sync AS
SELECT
  a.id                                            AS auth_user_id,
  a.email                                         AS auth_email,
  a.created_at                                    AS auth_created_at,
  a.email_confirmed_at                            AS auth_email_confirmed_at,
  a.last_sign_in_at                               AS auth_last_sign_in_at,
  u.id                                            AS profile_user_id,
  u.email                                         AS profile_email,
  u.is_admin                                      AS profile_is_admin,
  u.created_at                                    AS profile_created_at,
  u.updated_at                                    AS profile_updated_at,
  CASE WHEN u.id IS NULL THEN TRUE ELSE FALSE END AS profile_missing,
  CASE
    WHEN u.id IS NOT NULL AND a.email IS DISTINCT FROM u.email THEN TRUE
    ELSE FALSE
  END                                             AS email_mismatch
FROM auth.users a
LEFT JOIN public.users u ON u.id = a.id;

ALTER VIEW public.auth_users_sync OWNER TO postgres;
GRANT SELECT ON public.auth_users_sync TO postgres;
GRANT SELECT ON public.auth_users_sync TO service_role;
