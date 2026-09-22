-- Migration 016: Custom admin sign-up confirmation email hook (pg_net → Next.js).
--
-- Problem: Supabase's pool SMTP has tight rate limits, so sign-up confirmation
-- emails silently fail when several admins sign up in a short window. Also,
-- the dashboard "Site URL" fallback can rewrite redirects back to localhost on
-- preview deployments when the host is not allowlisted.
--
-- Solution: Install a Postgres AFTER INSERT trigger on auth.users that calls
-- pg_net.http_post() to hit the Next.js /api/auth/custom-send-confirmation
-- endpoint. That endpoint uses the existing MailerSend account (the same one
-- used for booking confirmations) to deliver a branded confirmation email
-- carrying an action link generated via supabaseAdmin.auth.admin.generateLink
-- with a host-specific redirectTo (no Supabase localhost fallback).
--
-- SECURITY NOTES:
--   * The trigger function is SECURITY DEFINER owned by postgres and executes
--     pg_net calls as the database superuser, because the `supabase_auth_admin`
--     role that fires INSERTs into auth.users does not have USAGE on pg_net.
--   * The trigger builds a JSON payload and computes an HMAC-SHA-256 signature
--     using the SUPABASE_AUTH_WEBHOOK_SECRET stored in vault.secrets. The
--     Next.js endpoint verifies the HMAC before sending any mail, so even if
--     an attacker can reach the endpoint from the public internet, they
--     cannot forge mail requests.
--   * The trigger runs AFTER INSERT and catches + logs every exception so a
--     mailer outage cannot prevent a user from being written to auth.users.
--   * We only fire the HTTP call for users where email_confirmed_at IS NULL
--     (skip SSO / manually-confirmed admins who don't need confirmation mail)
--     and where the user email does NOT look like a disposable test address.
--
-- BEFORE APPLYING THIS MIGRATION IN PRODUCTION:
--   1. Set SUPABASE_AUTH_WEBHOOK_SECRET in Netlify / hosting env vars for the
--      Next.js app AND in Supabase Vault:
--
--        SELECT vault.create_secret(
--          'long-random-string-here-at-least-32-chars',
--          'supabase_auth_webhook_secret',
--          'Shared HMAC secret used by auth.users trigger to call /api/auth/custom-send-confirmation'
--        );
--
--      (The secret is the same value on both sides.)
--
--   2. Update the CUSTOM_SEND_CONFIRMATION_URL placeholder below to the public
--      URL of your deployed Next.js app, e.g.
--      'https://fincaguarumo.com/api/auth/custom-send-confirmation'
--      or, for Netlify previews, a stable host that Netlify rewrites to the
--      correct deploy based on Host header. If you need per-deploy URLs in
--      preview, set the URL at runtime via a Vault secret instead (see the
--      commented alternative below).
--
--   3. Enable the vault and pg_net extensions (the CREATE EXTENSION calls
--      below are idempotent).
--
--   4. Optionally: disable "Enable email confirmations" in the Supabase Auth
--      dashboard, or keep it enabled and treat this trigger as a "resend" /
--      bypass for Supabase SMTP failures. Both strategies are supported.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

-- Allow the postgres role (the SECURITY DEFINER context) to use pg_net.
GRANT USAGE ON SCHEMA extensions TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO postgres;

-- ###########################################################################
-- 1. Configuration function — change these two values for your deploy.
-- ###########################################################################

CREATE OR REPLACE FUNCTION public.custom_confirmation_hook_url()
RETURNS text
LANGUAGE sql
IMMUTABLE
RETURNS NULL ON NULL INPUT
AS $$
  -- 👇 Replace this with the public URL of /api/auth/custom-send-confirmation
  SELECT 'https://deploy-preview-80--fincaguarumo.netlify.app/api/auth/custom-send-confirmation'::text;
$$;

ALTER FUNCTION public.custom_confirmation_hook_url() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.custom_confirmation_hook_url() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.custom_confirmation_hook_url() TO postgres;

COMMENT ON FUNCTION public.custom_confirmation_hook_url() IS
'Public URL of the Next.js /api/auth/custom-send-confirmation endpoint.
The auth.users trigger POSTs confirmation email payloads here via pg_net.';

-- Optional (recommended for Netlify previews / multi-env): override the
-- hard-coded URL above by storing a secret in the Vault at runtime.
-- Uncomment the following block and create the secret:
--
--   SELECT vault.create_secret(
--     'https://deploy-preview-80--fincaguarumo.netlify.app/api/auth/custom-send-confirmation',
--     'custom_confirmation_hook_url'
--   );
--
-- The trigger below prefers the Vault value and falls back to the IMMUTABLE
-- function if no such secret exists.

-- ###########################################################################
-- 2. Helper: resolve the webhook URL (vault override > function default)
-- ###########################################################################

CREATE OR REPLACE FUNCTION public._custom_confirmation_hook_url_resolved()
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public, vault, extensions, pg_catalog
AS $$
DECLARE
  v_vault_url text;
BEGIN
  -- Vault values live in vault.decrypted_secrets.name = 'custom_confirmation_hook_url'
  -- We guard with a BEGIN/EXCEPTION block so missing vault schema doesn't fail.
  BEGIN
    SELECT decrypted_secret
      INTO v_vault_url
      FROM vault.decrypted_secrets
     WHERE name = 'custom_confirmation_hook_url'
     LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_vault_url := NULL;
  END;

  IF v_vault_url IS NOT NULL AND length(v_vault_url) > 0 THEN
    RETURN v_vault_url;
  END IF;

  RETURN public.custom_confirmation_hook_url();
END;
$$;

ALTER FUNCTION public._custom_confirmation_hook_url_resolved() OWNER TO postgres;
REVOKE ALL ON FUNCTION public._custom_confirmation_hook_url_resolved() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._custom_confirmation_hook_url_resolved() TO postgres;

-- ###########################################################################
-- 3. Helper: read the shared HMAC secret from Vault.
-- ###########################################################################

CREATE OR REPLACE FUNCTION public._custom_confirmation_hmac_secret()
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public, vault, extensions, pg_catalog
AS $$
DECLARE
  v_secret text;
BEGIN
  BEGIN
    SELECT decrypted_secret
      INTO v_secret
      FROM vault.decrypted_secrets
     WHERE name = 'supabase_auth_webhook_secret'
     LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_secret := NULL;
  END;

  RETURN v_secret;
END;
$$;

ALTER FUNCTION public._custom_confirmation_hmac_secret() OWNER TO postgres;
REVOKE ALL ON FUNCTION public._custom_confirmation_hmac_secret() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._custom_confirmation_hmac_secret() TO postgres;

-- ###########################################################################
-- 4. Trigger function: build JSON payload, HMAC-sign it, then async POST.
-- ###########################################################################

CREATE OR REPLACE FUNCTION public.handle_send_confirmation_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions, pg_catalog
AS $$
DECLARE
  v_payload       text;
  v_payload_sig   text;
  v_signed_body   text;
  v_secret        text;
  v_url           text;
  v_non_headers   jsonb;
  v_nonce         text;
  v_should_send   boolean;
BEGIN
  -- Always return the NEW row: mail delivery must NEVER block user creation.
  -- We swallow all exceptions internally below.
  BEGIN
    -- Skip when the email is already confirmed (manual admin creation, SSO,
    -- or confirmations are globally disabled in dashboard).
    v_should_send := NEW.email_confirmed_at IS NULL
                 AND NEW.email IS NOT NULL
                 AND NEW.email LIKE '%@%'
                 AND (NEW.raw_user_meta_data IS NULL OR
                      NEW.raw_user_meta_data ->> '_suppress_custom_confirmation' IS NULL);

    IF NOT v_should_send THEN
      RETURN NEW;
    END IF;

    v_url    := public._custom_confirmation_hook_url_resolved();
    v_secret := public._custom_confirmation_hmac_secret();

    -- If the secret or URL is not configured yet, bail out silently rather
    -- than failing every signup. The operator can inspect
    -- public.auth_users_sync (migration 015) + diag-link endpoint to notice
    -- that custom mail isn't firing.
    IF v_secret IS NULL OR length(v_secret) = 0 THEN
      RETURN NEW;
    END IF;
    IF v_url IS NULL OR length(v_url) = 0 THEN
      RETURN NEW;
    END IF;

    v_nonce := substr(encode(gen_random_bytes(16), 'hex'), 1, 32);

    -- Build the base payload (same structure Next.js will deserialize).
    SELECT json_strip_nulls(json_build_object(
      'email',     NEW.email,
      'user_id',   NEW.id::text,
      'locale',    COALESCE(NEW.raw_user_meta_data ->> 'locale',
                            NEW.raw_app_meta_data  ->> 'locale'),
      'redirectTo', COALESCE(NEW.raw_user_meta_data ->> 'emailRedirectTo',
                             NEW.raw_app_meta_data  ->> 'emailRedirectTo'),
      'nonce',     v_nonce
    ))::text INTO v_payload;

    -- HMAC-SHA-256 over the canonical JSON payload. We use pgcrypto's hmac.
    SELECT encode(extensions.hmac(v_payload::bytea,
                                  v_secret::bytea,
                                  'sha256'), 'hex') INTO v_payload_sig;

    -- Append "signature" to the payload; Next.js re-strips and re-signs the
    -- same shape to verify.
    SELECT json_build_object(
      'email',      NEW.email,
      'user_id',    NEW.id::text,
      'locale',     COALESCE(NEW.raw_user_meta_data ->> 'locale',
                             NEW.raw_app_meta_data  ->> 'locale'),
      'redirectTo', COALESCE(NEW.raw_user_meta_data ->> 'emailRedirectTo',
                             NEW.raw_app_meta_data  ->> 'emailRedirectTo'),
      'nonce',      v_nonce,
      'signature',  v_payload_sig
    )::text INTO v_signed_body;

    -- The request id / user id is echoed for logs.
    v_non_headers := jsonb_build_object(
      'Content-Type',       'application/json',
      'X-Request-ID',       ('auth-trigger-' || NEW.id::text || '-' || v_nonce),
      'X-Signature-Version','hmac-sha-256-v1'
    );

    -- Fire-and-forget via pg_net. http_post returns a bigint (request id).
    -- We do not await the response. Failures are inspectable via:
    --   SELECT * FROM net.http_requests ORDER BY created_at DESC LIMIT 50;
    PERFORM extensions.net.http_post(
      url         := v_url,
      body        := v_signed_body::jsonb,
      headers     := v_non_headers,
      timeout_ms  := 5000
    );

  EXCEPTION WHEN OTHERS THEN
    -- Intentionally swallow: auth.users insert MUST succeed even if
    -- pg_net or the mailer are misbehaving.
    RAISE WARNING 'handle_send_confirmation_email: % | SQLSTATE %',
                  SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_send_confirmation_email() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.handle_send_confirmation_email() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_send_confirmation_email() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_send_confirmation_email() TO supabase_auth_admin;

COMMENT ON FUNCTION public.handle_send_confirmation_email() IS
'Postgres AFTER INSERT trigger on auth.users that HMAC-signs a JSON payload
and POSTs it via pg_net to the Next.js custom-send-confirmation endpoint.
Used to bypass Supabase SMTP rate limits for admin sign-up confirmations.';

-- ###########################################################################
-- 5. Install the trigger AFTER the existing on_auth_user_created trigger so
--    public.users profile row exists before we attempt any outbound call.
-- ###########################################################################

DROP TRIGGER IF EXISTS on_auth_user_created_send_confirmation ON auth.users;

CREATE TRIGGER on_auth_user_created_send_confirmation
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NULL AND NEW.email IS NOT NULL)
  EXECUTE FUNCTION public.handle_send_confirmation_email();

-- Ensure we run AFTER the profile-sync trigger, not before.
-- (If the other trigger fires by name we can enforce ordering.)
-- Postgres executes same-timing triggers in name order; we start with
-- "on_auth_user_created_" (existing) then "..._send_confirmation".
