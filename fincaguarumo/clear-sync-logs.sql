-- Clear all sync logs to prepare for fresh sync
DELETE FROM gcal_sync_log;

-- Reset the hash state in the frontend by clearing any cached data
-- This will be handled automatically when the page reloads
