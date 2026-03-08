-- Migration: Add users table and update RLS policies for admin operations
-- Run this in your Supabase SQL Editor

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

CREATE POLICY "Users can view their own profile" 
ON users FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" 
ON users FOR SELECT 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE id = auth.uid() AND is_admin = TRUE
));

CREATE POLICY "Users can insert their own profile" 
ON users FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update all users" 
ON users FOR UPDATE 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE id = auth.uid() AND is_admin = TRUE
))
WITH CHECK (EXISTS (
  SELECT 1 FROM users 
  WHERE id = auth.uid() AND is_admin = TRUE
));

-- Update availability table RLS policies to restrict admin operations
-- Drop existing policies
DROP POLICY IF EXISTS "Allow anonymous inserts on availability" ON availability;
DROP POLICY IF EXISTS "Allow anonymous updates on availability" ON availability;
DROP POLICY IF EXISTS "Allow anonymous deletes on availability" ON availability;

-- Keep read access public for availability checking
CREATE POLICY "Allow public selects on availability" 
ON availability FOR SELECT 
TO anon, authenticated 
USING (true);

-- Restrict mutations to admins only
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

-- Create a function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create an initial admin user (replace with actual admin email)
-- This should be run manually after creating the admin user in Supabase Auth
-- UPDATE users SET is_admin = TRUE WHERE email = 'admin@example.com';
