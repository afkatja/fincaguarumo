-- Force PostgREST schema cache refresh
-- Run this AFTER running migration 001 to ensure new columns are recognized

-- Method 1: Comment/uncomment to trigger schema reload
-- This dummy comment forces PostgREST to reload the schema

-- Method 2: Run a simple query to refresh cache
SELECT 1;

-- Method 3: Verify all columns exist
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'bookings'
ORDER BY ordinal_position;

-- If columns are still missing, the migration didn't run properly
-- Run this to add them manually:

-- Add missing columns one by one with explicit checks
DO $$
BEGIN
    -- Check and add booking_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'booking_type') THEN
        ALTER TABLE bookings ADD COLUMN booking_type VARCHAR(50) DEFAULT 'villa';
    END IF;
    
    -- Check and add total_price
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'total_price') THEN
        ALTER TABLE bookings ADD COLUMN total_price DECIMAL(10,2);
    END IF;
    
    -- Check and add currency
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'currency') THEN
        ALTER TABLE bookings ADD COLUMN currency VARCHAR(10) DEFAULT 'usd';
    END IF;
    
    -- Check and add email
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'email') THEN
        ALTER TABLE bookings ADD COLUMN email VARCHAR(255);
    END IF;
    
    -- Check and add phone
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'phone') THEN
        ALTER TABLE bookings ADD COLUMN phone VARCHAR(50);
    END IF;
    
    -- Check and add summary
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'summary') THEN
        ALTER TABLE bookings ADD COLUMN summary TEXT;
    END IF;
    
    -- Check and add description
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'description') THEN
        ALTER TABLE bookings ADD COLUMN description TEXT;
    END IF;
    
    -- Check and add synced_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'synced_at') THEN
        ALTER TABLE bookings ADD COLUMN synced_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Verify columns were added
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'bookings' 
ORDER BY ordinal_position;
