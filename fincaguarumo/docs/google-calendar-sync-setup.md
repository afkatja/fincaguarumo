# Google Calendar Sync Setup Guide

This guide explains how to set up and configure the Google Calendar sync feature for the Finca Guarumo booking system.

## Overview

The Google Calendar sync feature automatically synchronizes confirmed bookings to a private Google Calendar with 24-hour advance alerts for check-in and check-out events.

## Prerequisites

- Google Calendar account with admin access
- Supabase project with service role key
- Netlify account (for deployment and cron jobs)
- Google Cloud Platform project for service account

## Step 1: Google Calendar Setup

### 1.1 Create Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to **IAM & Admin** > **Service Accounts**
4. Click **Create Service Account**
5. Enter service account details:
   - Name: `finca-guarumo-calendar-sync`
   - Description: `Calendar sync service for Finca Guarumo bookings`
6. Click **Create and Continue**
7. Skip granting roles (we'll grant specific permissions next)
8. Click **Done**

### 1.2 Enable Google Calendar API

1. In Google Cloud Console, navigate to **APIs & Services** > **Library**
2. Search for "Google Calendar API"
3. Click **Enable**
4. Wait for the API to be enabled

### 1.3 Grant Calendar Access

1. Go to your Google Calendar
2. Find the calendar ID (usually your email address for primary calendar)
3. Share the calendar with the service account email:
   - Click the calendar name > **Settings and sharing**
   - Scroll to **Share with specific people**
   - Add the service account email
   - Grant **Make changes to events** permission
   - Click **Send**

### 1.4 Create Service Account Key

1. Go back to the service account in Google Cloud Console
2. Click on the service account email
3. Go to **Keys** tab
4. Click **Add Key** > **Create new key**
5. Select **JSON** format
6. Click **Create**
7. Download the JSON file and keep it secure

## Step 2: Environment Variables Configuration

### 2.1 Required Environment Variables

Add these to your Netlify environment variables:

```bash
# Google Calendar Configuration
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=base64-encoded-json-content
GOOGLE_CALENDAR_ID=your-calendar-id@gmail.com

# Sync Configuration
CALENDAR_SYNC_SECRET=your-secret-key-here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application Configuration
NEXT_PUBLIC_SITE_URL=https://your-domain.netlify.app
```

### 2.2 Encode Service Account Key

1. Take the downloaded JSON key file content
2. Encode it to base64:
   ```bash
   # On macOS/Linux
   base64 -i service-account-key.json
   
   # On Windows (PowerShell)
   [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((Get-Content -Path "service-account-key.json" -Raw)))
   ```
3. Use the base64 string for `GOOGLE_SERVICE_ACCOUNT_KEY_FILE`

## Step 3: Database Setup

### 3.1 Run Database Migration

The sync feature requires the `gcal_sync_log` table. Run the migration:

```sql
-- This migration should already be in your supabase/migrations/ folder
-- File: 011_create_gcal_sync_log.sql
```

### 3.2 Verify Table Structure

```sql
-- Verify the table exists and has correct structure
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'gcal_sync_log'
ORDER BY ordinal_position;
```

## Step 4: Netlify Configuration

### 4.1 Update netlify.toml

Add cron job configuration to your `netlify.toml`:

```toml
[[scheduled_functions]]
path = "/api/calendar-sync"
schedule = "*/15 * * * *"  # Every 15 minutes

# Or using Netlify Functions (alternative approach)
[[functions]]
path = "calendar-sync-background"
schedule = "*/15 * * * *"
```

### 4.2 Deploy Background Function

The background function is located at:
```
netlify/functions/calendar-sync-background.ts
```

This function will be automatically deployed and scheduled by Netlify.

## Step 5: Testing the Setup

### 5.1 Manual Sync Test

Test the sync manually before enabling cron jobs:

```bash
# Test sync with dry run
curl -X POST "https://your-domain.netlify.app/api/calendar-sync?secret=YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'

# Test actual sync
curl -X POST "https://your-domain.netlify.app/api/calendar-sync?secret=YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

### 5.2 Verify Calendar Events

1. Check your Google Calendar
2. Look for booking events with:
   - Guest names in titles
   - 24-hour alerts set
   - Correct dates and times (Costa Rica timezone)

### 5.3 Check Sync Logs

Monitor sync status through the admin interface:
```
https://your-domain.netlify.app/admin/calendar-sync
```

## Step 6: Monitoring and Maintenance

### 6.1 Sync Status Monitoring

- Check the admin dashboard for sync status
- Monitor Netlify function logs
- Set up alerts for failed sync operations

### 6.2 Common Issues and Solutions

#### Issue: "Calendar access failed"
**Solution**: Verify service account permissions and calendar sharing

#### Issue: "Sync skipped - not time to run yet"
**Solution**: Use `force: true` parameter to override frequency check

#### Issue: Events not appearing in calendar
**Solution**: Check service account authentication and calendar ID

#### Issue: Wrong timezone
**Solution**: Verify booking data has correct timezone information

### 6.3 Maintenance Tasks

- Clean up old sync logs (automatically done every 90 days)
- Monitor Google Calendar API quota usage
- Update service account keys if compromised

## Step 7: Security Considerations

### 7.1 Environment Variable Security

- Never commit secrets to version control
- Use Netlify's encrypted environment variables
- Rotate secrets regularly
- Limit service account permissions to minimum required

### 7.2 Access Control

- The sync API requires a secret key (`CALENDAR_SYNC_SECRET`)
- Only authorized systems should know this secret
- Consider IP restrictions for additional security

## Step 8: Advanced Configuration

### 8.1 Custom Sync Frequency

To change sync frequency, modify the cron expression:

```toml
# Every 30 minutes
[[scheduled_functions]]
path = "/api/calendar-sync"
schedule = "*/30 * * * *"

# Every hour
[[scheduled_functions]]
path = "/api/calendar-sync"
schedule = "0 * * * *"
```

### 8.2 Multiple Calendars

For multiple properties/calendars, you would need to:
1. Create separate service accounts for each calendar
2. Modify the sync logic to handle multiple calendar IDs
3. Update database schema to track calendar per booking

### 8.3 Custom Alert Timing

To change alert timing, modify the `ALERT_MINUTES` constant in:
```
src/lib/google-calendar.ts
```

## Troubleshooting Guide

### Common Error Messages

| Error | Cause | Solution |
|-------|--------|----------|
| "Unauthorized" | Missing/invalid secret | Check `CALENDAR_SYNC_SECRET` |
| "Calendar access failed" | Service account issues | Verify permissions and sharing |
| "Failed to fetch bookings" | API endpoint issues | Check `/api/ical/merged` endpoint |
| "Rate limit exceeded" | Too many API calls | Wait and retry (automatic) |

### Debug Mode

Enable debug logging by setting:
```bash
LOG_LEVEL=debug
```

### Support

For issues with:
- **Google Calendar API**: Check Google Cloud Console logs
- **Netlify Functions**: Check Netlify function logs
- **Database**: Check Supabase logs
- **Application**: Check application logs

## Success Metrics

Monitor these metrics to ensure the sync is working properly:

- **Sync success rate**: Should be >99%
- **Event creation time**: <5 seconds per booking
- **API quota usage**: Monitor Google Calendar API limits
- **Alert accuracy**: 24-hour alerts should fire correctly

## Conclusion

Once set up, the Google Calendar sync will automatically:
1. Check for booking changes every 15 minutes
2. Create/update calendar events for confirmed bookings
3. Set 24-hour advance alerts
4. Handle cancellations by removing events
5. Maintain sync logs for troubleshooting

The system is designed to be robust with retry logic, error handling, and comprehensive logging.
