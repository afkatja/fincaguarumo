-- Fix infinite recursion in users table RLS policies
-- The "Admins can view all users" policy recursively queries the users table
-- Solution: Use a SECURITY DEFINER function to check admin status

-- Create helper function to check if a user is admin
-- SECURITY DEFINER runs with the privileges of the function owner (postgres), bypassing RLS
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_admin FROM public.users WHERE id = user_id;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Create fixed policy using the helper function
CREATE POLICY "Admins can view all users" 
ON users FOR SELECT 
TO authenticated 
USING (public.is_admin(auth.uid()));

-- Also fix the availability table policies that have the same issue
DROP POLICY IF EXISTS "Allow admin inserts on availability" ON availability;
DROP POLICY IF EXISTS "Allow admin updates on availability" ON availability;
DROP POLICY IF EXISTS "Allow admin deletes on availability" ON availability;

CREATE POLICY "Allow admin inserts on availability" 
ON availability FOR INSERT 
TO authenticated 
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Allow admin updates on availability" 
ON availability FOR UPDATE 
TO authenticated 
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Allow admin deletes on availability" 
ON availability FOR DELETE 
TO authenticated 
USING (public.is_admin(auth.uid()));

-- Fix bookings table policies to use the helper function
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can insert any bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can update any bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can delete any bookings" ON bookings;

CREATE POLICY "Admins can view all bookings" 
ON bookings FOR SELECT 
TO authenticated 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert any bookings" 
ON bookings FOR INSERT 
TO authenticated 
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update any bookings" 
ON bookings FOR UPDATE 
TO authenticated 
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete any bookings" 
ON bookings FOR DELETE 
TO authenticated 
USING (public.is_admin(auth.uid()));
