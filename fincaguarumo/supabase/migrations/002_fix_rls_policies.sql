-- Fix RLS policies for bookings and availability tables
-- Run this in Supabase SQL Editor if you get RLS permission errors

-- Option 1: Disable RLS (simplest, but less secure)
-- Uncomment the lines below if you want to disable RLS completely:
-- ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE availability DISABLE ROW LEVEL SECURITY;

-- Option 2: Enable RLS with proper scoped policies (recommended for production)
-- This restricts access based on ownership and admin role

-- Enable RLS on tables
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow anonymous inserts on bookings" ON bookings;
DROP POLICY IF EXISTS "Allow anonymous selects on bookings" ON bookings;
DROP POLICY IF EXISTS "Allow anonymous updates on bookings" ON bookings;
DROP POLICY IF EXISTS "Allow anonymous deletes on bookings" ON bookings;

DROP POLICY IF EXISTS "Allow anonymous inserts on availability" ON availability;
DROP POLICY IF EXISTS "Allow anonymous selects on availability" ON availability;
DROP POLICY IF EXISTS "Allow anonymous updates on availability" ON availability;
DROP POLICY IF EXISTS "Allow anonymous deletes on availability" ON availability;

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

-- Create policies for availability table
-- Note: These policies are superseded by migration 007, but kept for completeness
-- Allow public read access for availability checking
CREATE POLICY "Allow public selects on availability" 
ON availability FOR SELECT 
TO anon, authenticated 
USING (true);

-- Restrict mutations to admins only (matching migration 007)
CREATE POLICY "Allow admin inserts on availability" 
ON availability FOR INSERT 
TO authenticated 
WITH CHECK (EXISTS (
  SELECT 1 FROM users 
  WHERE id = auth.uid() AND is_admin = TRUE
));

CREATE POLICY "Allow admin updates on availability" 
ON availability FOR UPDATE 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE id = auth.uid() AND is_admin = TRUE
))
WITH CHECK (EXISTS (
  SELECT 1 FROM users 
  WHERE id = auth.uid() AND is_admin = TRUE
));

CREATE POLICY "Allow admin deletes on availability" 
ON availability FOR DELETE 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE id = auth.uid() AND is_admin = TRUE
));
