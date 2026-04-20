-- Create table for Google Calendar sync tracking
CREATE TABLE IF NOT EXISTS gcal_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT NOT NULL,
  gcal_event_id TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign key constraint to bookings table (optional, as booking might not exist)
  CONSTRAINT fk_booking_id 
    FOREIGN KEY (booking_id) 
    REFERENCES bookings(uid) 
    ON DELETE CASCADE
);

-- Create index for faster lookups by booking_id
CREATE INDEX IF NOT EXISTS idx_gcal_sync_log_booking_id ON gcal_sync_log(booking_id);

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_gcal_sync_log_status ON gcal_sync_log(status);

-- Create index for synced_at for cleanup operations
CREATE INDEX IF NOT EXISTS idx_gcal_sync_log_synced_at ON gcal_sync_log(synced_at);

-- Unique constraint to prevent duplicate sync entries for same booking
ALTER TABLE gcal_sync_log ADD CONSTRAINT unique_booking_sync 
  UNIQUE (booking_id);

-- Enable RLS (Row Level Security)
ALTER TABLE gcal_sync_log ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access (bypass RLS)
CREATE POLICY "Service role can access all sync logs" ON gcal_sync_log
  FOR ALL USING (auth.role() = 'service_role');

-- Create policy for authenticated users (read-only access to their own data if needed)
CREATE POLICY "Authenticated users can read sync logs" ON gcal_sync_log
  FOR SELECT USING (auth.role() = 'authenticated');

-- Add comments for documentation
COMMENT ON TABLE gcal_sync_log IS 'Tracks synchronization status between bookings and Google Calendar events';
COMMENT ON COLUMN gcal_sync_log.booking_id IS 'Unique identifier from the booking system (UID)';
COMMENT ON COLUMN gcal_sync_log.gcal_event_id IS 'Google Calendar event ID for reference';
COMMENT ON COLUMN gcal_sync_log.synced_at IS 'Timestamp of last sync operation';
COMMENT ON COLUMN gcal_sync_log.status IS 'Current sync status: success, failed, or pending';
COMMENT ON COLUMN gcal_sync_log.error_message IS 'Detailed error message if sync failed';
