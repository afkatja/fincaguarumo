-- Migration 020: Drop availability table (no longer needed)
-- Availability is now derived directly from the bookings table
-- Airbnb iCal sync is the primary source of truth

-- Drop the unique constraint first (if it exists from migration 019)
ALTER TABLE public.availability DROP CONSTRAINT IF EXISTS availability_booking_date_unique;

-- Drop the availability table
DROP TABLE IF EXISTS public.availability CASCADE;