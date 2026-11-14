-- Migration 020: Drop availability table (no longer needed)
-- Availability is now derived directly from the bookings table
-- Airbnb iCal sync is the primary source of truth

-- Drop the unique constraint first (if the table still exists from migration 019).
-- Guard with a table-existence check so the migration succeeds when
-- public.availability is absent; dropping the table removes its constraints anyway.
DO $$
BEGIN
  IF to_regclass('public.availability') IS NOT NULL THEN
    ALTER TABLE public.availability DROP CONSTRAINT IF EXISTS availability_booking_date_unique;
  END IF;
END $$;

-- Drop the availability table
DROP TABLE IF EXISTS public.availability CASCADE;