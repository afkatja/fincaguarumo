-- Migration 021: Add is_test column to bookings table
-- Allows filtering test bookings from availability checks

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT FALSE;

-- Create index for filtering test bookings
CREATE INDEX IF NOT EXISTS idx_bookings_is_test ON public.bookings(is_test);