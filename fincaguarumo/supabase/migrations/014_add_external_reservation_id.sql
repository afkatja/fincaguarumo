-- Migration: Add external_reservation_id column to bookings table
-- This stores the reservation ID from external platforms (booking.com, airbnb, etc.)
-- Used for MOTO VCC charging reconciliation

-- This migration must run outside a transaction for CREATE INDEX CONCURRENTLY
-- Run with: psql -c "SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL REPEATABLE READ;" -f 014_add_external_reservation_id.sql

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS external_reservation_id VARCHAR(255);

-- Step 1: Create concurrent index on (source, external_reservation_id)
-- CONCURRENTLY requires running outside a transaction block
-- This index supports efficient lookups per provider/platform without enforcing uniqueness
-- Duplicate records are preserved for auditing and reconciliation purposes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_source_external_reservation_id
ON bookings (source, external_reservation_id)
WHERE external_reservation_id IS NOT NULL;

-- Step 2: Create partial index for backward-compatible lookups without source
-- Used when finance endpoint receives only external_reservation_id without source
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_external_reservation_id
ON bookings (external_reservation_id)
WHERE external_reservation_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN bookings.external_reservation_id IS 'External reservation ID from booking platforms (booking.com, airbnb, etc.) for VCC charging reconciliation';