-- Fix RLS policies for bookings and availability tables
-- Run this in Supabase SQL Editor if you get RLS permission errors

-- Option 1: Disable RLS (simplest, but less secure)
-- Uncomment the lines below if you want to disable RLS completely:
-- ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE availability DISABLE ROW LEVEL SECURITY;

-- Option 2: Enable RLS with policies (recommended for production)
-- This allows anonymous access (for server-side API calls)

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

-- Create policies for bookings table
CREATE POLICY "Allow anonymous inserts on bookings" 
ON bookings FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

CREATE POLICY "Allow anonymous selects on bookings" 
ON bookings FOR SELECT 
TO anon, authenticated 
USING (true);

CREATE POLICY "Allow anonymous updates on bookings" 
ON bookings FOR UPDATE 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow anonymous deletes on bookings" 
ON bookings FOR DELETE 
TO anon, authenticated 
USING (true);

-- Create policies for availability table
CREATE POLICY "Allow anonymous inserts on availability" 
ON availability FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

CREATE POLICY "Allow anonymous selects on availability" 
ON availability FOR SELECT 
TO anon, authenticated 
USING (true);

CREATE POLICY "Allow anonymous updates on availability" 
ON availability FOR UPDATE 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow anonymous deletes on availability" 
ON availability FOR DELETE 
TO anon, authenticated 
USING (true);
