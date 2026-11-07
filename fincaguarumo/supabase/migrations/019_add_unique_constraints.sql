-- Migration 019: Add unique constraints for data integrity
-- Ensures upsert operations work correctly and prevents duplicate data

-- 1. Add unique constraint on bookings.uid
-- This is required for the upsert operation in ical-sync.ts to work correctly
-- (onConflict: "uid" requires a unique index/constraint)
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_uid_unique UNIQUE (uid);

-- 2. Add unique constraint on gcal_sync_log.booking_id
-- Ensures upsert on booking_id works correctly
-- Note: This may already exist from migration 011, but adding for safety
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'gcal_sync_log_booking_id_unique'
    AND conrelid = 'public.gcal_sync_log'::regclass
  ) THEN
    ALTER TABLE public.gcal_sync_log 
    ADD CONSTRAINT gcal_sync_log_booking_id_unique UNIQUE (booking_id);
  END IF;
END $$;