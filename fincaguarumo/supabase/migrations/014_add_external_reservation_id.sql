-- Migration: Add external_reservation_id column to bookings table
-- This stores the reservation ID from external platforms (booking.com, airbnb, etc.)
-- Used for MOTO VCC charging reconciliation

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS external_reservation_id VARCHAR(255);

-- Create index for fast lookups by external reservation ID
CREATE INDEX IF NOT EXISTS idx_bookings_external_reservation_id
ON bookings(external_reservation_id);

-- Add comment for documentation
COMMENT ON COLUMN bookings.external_reservation_id IS 'External reservation ID from booking platforms (booking.com, airbnb, etc.) for VCC charging reconciliation';