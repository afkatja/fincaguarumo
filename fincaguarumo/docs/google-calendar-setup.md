# Google Calendar Integration Setup

This document explains how to set up Google Calendar integration for the Finca Guarumo booking system.

## Overview

The system automatically syncs confirmed bookings to a private Google Calendar with 24-hour advance alerts for check-in and check-out events.

## Required Environment Variables

Add these environment variables to your Netlify dashboard (for production) or `.env.local` (for development):

### Google Calendar API

```bash
# Google Calendar API credentials
GOOGLE_CALENDAR_ID=primary  # or your specific calendar ID
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback

# For service account authentication (recommended)
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=path/to/service-account-key.json

# Calendar sync security
CALENDAR_SYNC_SECRET=your_random_secret_key_for_cron_validation
```

### Existing Variables (already configured)

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

## Setup Instructions

### 1. Google Cloud Project Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### 2. Authentication Setup

#### Option A: Service Account (Recommended for Production)

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in service account details:
   - Name: "Finca Guarumo Calendar Sync"
   - Description: "Automated booking calendar synchronization"
4. Create and continue through permissions
5. Skip granting users access (click "Done")
6. Create a JSON key for the service account:
   - Select the service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key" > "JSON"
   - Download and save the key file securely

7. Share your Google Calendar with the service account:
   - Open your Google Calendar
   - Find the calendar ID (in settings)
   - Share the calendar with the service account email
   - Grant "Make changes to events" permission

#### Option B: OAuth 2.0 (For Development)

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Select "Web application"
4. Add authorized redirect URI: `https://yourdomain.com/api/auth/google/callback`
5. Download client configuration

### 3. Netlify Configuration

1. Go to your Netlify site dashboard
2. Navigate to "Site settings" > "Environment variables"
3. Add all the required environment variables from above
4. Deploy the site to apply changes

### 4. Database Setup

The system will automatically create the `gcal_sync_log` table via migration. If you need to create it manually:

```sql
-- Run this in Supabase SQL editor
CREATE TABLE IF NOT EXISTS gcal_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT NOT NULL,
  gcal_event_id TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Testing the Integration

### Manual Test

1. Trigger a manual sync:
   ```bash
   curl -X POST "https://yourdomain.com/api/calendar-sync?secret=YOUR_SYNC_SECRET" \
        -H "Content-Type: application/json" \
        -d '{"dryRun": false}'
   ```

2. Check sync status:
   ```bash
   curl "https://yourdomain.com/api/calendar-sync?secret=YOUR_SYNC_SECRET"
   ```

### Verify Calendar Events

1. Check your Google Calendar for new events
2. Events should include:
   - Guest name and contact information
   - Check-in and check-out dates/times
   - 24-hour advance alerts (popup and email)

## Cron Job Configuration

The system is configured to automatically sync every 15 minutes via Netlify scheduled functions:

```toml
# In netlify.toml
[[scheduled_functions]]
  name = "calendar-sync"
  schedule = "*/15 * * * *"
  function = "calendar-sync"
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Check that the service account has calendar access
2. **Invalid Credentials**: Verify environment variables are correctly set
3. **Sync Failures**: Check the `gcal_sync_log` table for error messages
4. **Missing Events**: Verify booking data has valid UIDs

### Debug Information

Check the following for debugging:

1. Netlify function logs
2. API response logs
3. Supabase `gcal_sync_log` table
4. Google Calendar API quota usage

### Security Notes

- Always use HTTPS for redirect URIs
- Keep service account keys secure
- Use strong secrets for `CALENDAR_SYNC_SECRET`
- Monitor API quota and usage

## Monitoring

The system provides sync statistics via the API:

```json
{
  "sync": {
    "totalBookings": 45,
    "syncedBookings": 43,
    "failedSyncs": 2,
    "lastSyncTime": "2026-04-17T14:30:00.000Z"
  },
  "calendar": {
    "accessible": true,
    "calendarId": "primary"
  }
}
```

## Success Metrics

- **100%** of merged bookings appear in calendar within 5 minutes
- **Zero** duplicate calendar events
- **>99%** alert accuracy rate
- **>99.9%** calendar subscription reliability

Monitor these metrics through the sync API and Google Calendar.
