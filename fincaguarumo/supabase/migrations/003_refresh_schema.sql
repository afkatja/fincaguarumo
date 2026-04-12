-- Force Supabase to refresh schema cache
-- Run this after adding new columns if you get "Could not find column" errors

-- Simple SELECT to refresh the schema cache
SELECT * FROM bookings LIMIT 0;
SELECT * FROM availability LIMIT 0;

-- Alternative: comment out to verify columns exist
-- This will show all columns in both tables
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('bookings', 'availability')
ORDER BY table_name, ordinal_position;
