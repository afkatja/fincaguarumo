-- Migration: Add failed_emails table for email queue and retry system
-- This table stores failed email attempts for retry processing

-- Create failed_emails table
CREATE TABLE IF NOT EXISTS failed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type TEXT NOT NULL, -- 'confirmation', 'error', 'admin_notification'
  recipient_email TEXT NOT NULL,
  subject TEXT,
  content JSONB NOT NULL, -- Email content and metadata
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_failed_emails_next_retry ON failed_emails(next_retry_at) WHERE next_retry_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_failed_emails_type ON failed_emails(email_type);
CREATE INDEX IF NOT EXISTS idx_failed_emails_created_at ON failed_emails(created_at);

-- Enable RLS on failed_emails table
ALTER TABLE failed_emails ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow admin access to failed_emails" ON failed_emails;

-- Create policy for admin access only (deferred to avoid dependency issues)
-- This policy will be created in a separate migration after ensuring users table exists

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_failed_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_failed_emails_updated_at_trigger ON failed_emails;
CREATE TRIGGER update_failed_emails_updated_at_trigger
    BEFORE UPDATE ON failed_emails
    FOR EACH ROW
    EXECUTE FUNCTION update_failed_emails_updated_at();

-- Add comment for documentation
COMMENT ON TABLE failed_emails IS 'Queue for failed email attempts with retry logic';
COMMENT ON COLUMN failed_emails.email_type IS 'Type of email: confirmation, error, admin_notification';
COMMENT ON COLUMN failed_emails.content IS 'JSON containing email content, recipient details, and metadata';
COMMENT ON COLUMN failed_emails.next_retry_at IS 'When this email should be retried next';
