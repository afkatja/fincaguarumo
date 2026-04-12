-- Migration: Add missing columns to bookings and availability tables
-- Run this in your Supabase SQL Editor

-- Add columns to bookings table if they don't exist
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS booking_type VARCHAR(50) DEFAULT 'villa',
ADD COLUMN IF NOT EXISTS total_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'usd';

-- Add columns to availability table if they don't exist
ALTER TABLE availability
ADD COLUMN IF NOT EXISTS booking_uid VARCHAR(255),
ADD COLUMN IF NOT EXISTS reason TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index on booking_uid for faster lookups
CREATE INDEX IF NOT EXISTS idx_availability_booking_uid 
ON availability(booking_uid);

-- Create index on uid for bookings table
CREATE INDEX IF NOT EXISTS idx_bookings_uid 
ON bookings(uid);

-- Create index on source for filtering
CREATE INDEX IF NOT EXISTS idx_bookings_source 
ON bookings(source);

-- Create index on date ranges for availability queries
CREATE INDEX IF NOT EXISTS idx_availability_dates 
ON availability(start_date, end_date);

-- Create index on booking_type
CREATE INDEX IF NOT EXISTS idx_bookings_type 
ON bookings(booking_type);

-- Note: RLS policies need to be created manually through the Supabase Dashboard
-- or using the correct PostgreSQL syntax. The IF NOT EXISTS clause is not
-- supported for CREATE POLICY. To enable RLS and create policies,
-- run the migration in 002_fix_rls_policies.sql

-- Enable RLS on tables (optional - run policies from 002_fix_rls_policies.sql after)
-- ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
