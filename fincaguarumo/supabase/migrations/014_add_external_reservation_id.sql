-- Migration: Add external_reservation_id column to bookings table
-- This stores the reservation ID from external platforms (booking.com, airbnb, etc.)
-- Used for MOTO VCC charging reconciliation

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS external_reservation_id VARCHAR(255);

-- Create unique constraint on (source, external_reservation_id) to enforce uniqueness
-- per provider, since the same external ID can exist across different platforms
ALTER TABLE bookings
ADD CONSTRAINT IF NOT EXISTS unique_source_external_reservation_id
UNIQUE (source, external_reservation_id);

-- Create index for fast lookups by external reservation ID (used in finance endpoint)
-- The unique constraint above also creates an index, but this partial index optimizes
-- lookups when source is not specified (backward compatibility)
CREATE INDEX IF NOT EXISTS idx_bookings_external_reservation_id
ON bookings(external_reservation_id)
WHERE external_reservation_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN bookings.external_reservation_id IS 'External reservation ID from booking platforms (booking.com, airbnb, etc.) for VCC charging reconciliation';