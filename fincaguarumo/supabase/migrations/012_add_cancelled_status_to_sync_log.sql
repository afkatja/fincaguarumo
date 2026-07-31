-- Add 'cancelled' status to gcal_sync_log status check constraint
-- This allows tracking cancelled bookings separately from successful/failed/pending

-- First drop the existing check constraint
ALTER TABLE gcal_sync_log DROP CONSTRAINT IF EXISTS gcal_sync_log_status_check;

-- Add the updated check constraint that includes 'cancelled'
ALTER TABLE gcal_sync_log 
ADD CONSTRAINT gcal_sync_log_status_check 
CHECK (status IN ('success', 'failed', 'pending', 'cancelled'));

-- Add comment for documentation
COMMENT ON COLUMN gcal_sync_log.status IS 'Current sync status: success, failed, pending, or cancelled (for bookings that were intentionally cancelled)';
