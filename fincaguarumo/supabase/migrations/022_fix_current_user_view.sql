-- Fix Security Definer View: public.current_user
-- This view was created with SECURITY DEFINER which bypasses RLS
-- Recreate it without SECURITY DEFINER to respect row-level security

-- Drop the existing view (if it exists)
DROP VIEW IF EXISTS public.current_user;

-- Recreate the view without SECURITY DEFINER
-- This view returns the current authenticated user's profile
CREATE VIEW public.current_user AS
SELECT 
  u.id,
  u.email,
  u.is_admin,
  u.created_at,
  u.updated_at
FROM public.users u
WHERE u.id = auth.uid();

-- Grant select permission to authenticated users
GRANT SELECT ON public.current_user TO authenticated;