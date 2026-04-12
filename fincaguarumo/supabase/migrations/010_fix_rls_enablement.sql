-- Fix RLS Enablement and Policy Issues
-- This migration ensures RLS is properly enabled and policies are correctly configured

-- First, ensure users table exists (in case migration 007 failed partially)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on users table if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 1. Ensure RLS is enabled on bookings table
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- 2. Ensure RLS is enabled on availability table  
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- 3. Drop any remaining anonymous access policies on bookings
DROP POLICY IF EXISTS "Allow anonymous deletes on bookings" ON bookings;
DROP POLICY IF EXISTS "Allow anonymous inserts on bookings" ON bookings;
DROP POLICY IF EXISTS "Allow anonymous selects on bookings" ON bookings;
DROP POLICY IF EXISTS "Allow anonymous updates on bookings" ON bookings;

-- 4. Drop any remaining anonymous access policies on availability
DROP POLICY IF EXISTS "Allow anonymous deletes on availability" ON availability;
DROP POLICY IF EXISTS "Allow anonymous inserts on availability" ON availability;
DROP POLICY IF EXISTS "Allow anonymous updates on availability" ON availability;

-- 5. Ensure proper policies exist for bookings (recreate if needed)
-- Users can view their own bookings
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
CREATE POLICY "Users can view their own bookings" 
ON bookings FOR SELECT 
TO authenticated 
USING (auth.uid()::text = uid);

-- Admins can view all bookings  
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
CREATE POLICY "Admins can view all bookings" 
ON bookings FOR SELECT 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE id = auth.uid() AND is_admin = TRUE
));

-- Users can insert their own bookings
DROP POLICY IF EXISTS "Users can insert their own bookings" ON bookings;
CREATE POLICY "Users can insert their own bookings" 
ON bookings FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid()::text = uid);

-- Admins can insert bookings for anyone
DROP POLICY IF EXISTS "Admins can insert any bookings" ON bookings;
CREATE POLICY "Admins can insert any bookings" 
ON bookings FOR INSERT 
TO authenticated 
WITH CHECK (EXISTS (
  SELECT 1 FROM users 
  WHERE id = auth.uid() AND is_admin = TRUE
));

-- Users can update their own bookings
DROP POLICY IF EXISTS "Users can update their own bookings" ON bookings;
CREATE POLICY "Users can update their own bookings" 
ON bookings FOR UPDATE 
TO authenticated 
USING (auth.uid()::text = uid) 
WITH CHECK (auth.uid()::text = uid);

-- Admins can update any bookings
DROP POLICY IF EXISTS "Admins can update any bookings" ON bookings;
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
DROP POLICY IF EXISTS "Users can delete their own bookings" ON bookings;
CREATE POLICY "Users can delete their own bookings" 
ON bookings FOR DELETE 
TO authenticated 
USING (auth.uid()::text = uid);

-- Admins can delete any bookings
DROP POLICY IF EXISTS "Admins can delete any bookings" ON bookings;
CREATE POLICY "Admins can delete any bookings" 
ON bookings FOR DELETE 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE id = auth.uid() AND is_admin = TRUE
));

-- 6. Ensure proper policies exist for availability (recreate if needed)
-- Keep read access public for availability checking
DROP POLICY IF EXISTS "Allow public selects on availability" ON availability;
CREATE POLICY "Allow public selects on availability" 
ON availability FOR SELECT 
TO anon, authenticated 
USING (true);

-- Restrict mutations to admins only
DROP POLICY IF EXISTS "Allow admin inserts on availability" ON availability;
CREATE POLICY "Allow admin inserts on availability" 
ON availability FOR INSERT 
TO authenticated 
WITH CHECK (EXISTS (
  SELECT 1 FROM users 
  WHERE id = auth.uid() AND is_admin = TRUE
));

DROP POLICY IF EXISTS "Allow admin updates on availability" ON availability;
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

DROP POLICY IF EXISTS "Allow admin deletes on availability" ON availability;
CREATE POLICY "Allow admin deletes on availability" 
ON availability FOR DELETE 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE id = auth.uid() AND is_admin = TRUE
));

-- 7. Create policy for failed_emails table (deferred from migration 009)
DROP POLICY IF EXISTS "Allow admin access to failed_emails" ON failed_emails;
CREATE POLICY "Allow admin access to failed_emails" 
ON failed_emails FOR ALL 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE id = auth.uid() AND is_admin = TRUE
))
WITH CHECK (EXISTS (
  SELECT 1 FROM users 
  WHERE id = auth.uid() AND is_admin = TRUE
));

-- 8. Verify RLS status with informational queries (these will show in migration logs)
DO $$
BEGIN
  RAISE NOTICE 'Checking RLS status...';
  
  -- Check if RLS is enabled
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'bookings' 
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE 'RLS is enabled on bookings table';
  ELSE
    RAISE NOTICE 'WARNING: RLS is NOT enabled on bookings table';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'availability' 
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE 'RLS is enabled on availability table';
  ELSE
    RAISE NOTICE 'WARNING: RLS is NOT enabled on availability table';
  END IF;
  
  -- Count policies on each table
  RAISE NOTICE 'Bookings policies count: %', (
    SELECT COUNT(*) FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'bookings'
  );
  
  RAISE NOTICE 'Availability policies count: %', (
    SELECT COUNT(*) FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'availability'
  );
  
  RAISE NOTICE 'Failed emails policies count: %', (
    SELECT COUNT(*) FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'failed_emails'
  );
  
  RAISE NOTICE 'Users table exists: %', (
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    )
  );
END $$;
