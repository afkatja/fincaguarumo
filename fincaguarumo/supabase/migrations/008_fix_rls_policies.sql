-- Fix RLS policies for bookings table
-- This migration runs after 007 to ensure users table exists

-- Enable RLS on bookings table (availability is handled in migration 007)
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow anonymous inserts on bookings" ON bookings;
DROP POLICY IF EXISTS "Allow anonymous selects on bookings" ON bookings;
DROP POLICY IF EXISTS "Allow anonymous updates on bookings" ON bookings;
DROP POLICY IF EXISTS "Allow anonymous deletes on bookings" ON bookings;

-- Create proper scoped policies for bookings table
-- Users can view their own bookings
CREATE POLICY "Users can view their own bookings" 
ON bookings FOR SELECT 
TO authenticated 
USING (auth.uid() = uid);

-- Admins can view all bookings
CREATE POLICY "Admins can view all bookings" 
ON bookings FOR SELECT 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE id = auth.uid() AND is_admin = TRUE
));

-- Users can insert their own bookings
CREATE POLICY "Users can insert their own bookings" 
ON bookings FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = uid);

-- Admins can insert bookings for anyone
CREATE POLICY "Admins can insert any bookings" 
ON bookings FOR INSERT 
TO authenticated 
WITH CHECK (EXISTS (
  SELECT 1 FROM users 
  WHERE id = auth.uid() AND is_admin = TRUE
));

-- Users can update their own bookings
CREATE POLICY "Users can update their own bookings" 
ON bookings FOR UPDATE 
TO authenticated 
USING (auth.uid() = uid) 
WITH CHECK (auth.uid() = uid);

-- Admins can update any bookings
CREATE POLICY "Admins can update any bookings" 
ON bookings FOR UPDATE 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE id = auth.uid() AND is_admin = TRUE
))
WITH CHECK (EXISTS (
  SELECT 1 FROM users 
  WHERE id = auth.uid() AND is_admin = TRUE
));

-- Users can delete their own bookings
CREATE POLICY "Users can delete their own bookings" 
ON bookings FOR DELETE 
TO authenticated 
USING (auth.uid() = uid);

-- Admins can delete any bookings
CREATE POLICY "Admins can delete any bookings" 
ON bookings FOR DELETE 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE id = auth.uid() AND is_admin = TRUE
));
