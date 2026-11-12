-- Migration 019: Add unique constraints for data integrity
-- Ensures upsert operations work correctly and prevents duplicate data

-- 1. Add unique constraint on bookings.uid
-- This is required for the upsert operation in ical-sync.ts to work correctly
-- (onConflict: "uid" requires a unique index/constraint)
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_uid_unique UNIQUE (uid);