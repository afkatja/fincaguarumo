# Finca Guarumo

A Next.js-based booking system for Finca Guarumo with Google Calendar integration, automated booking synchronization, and multilingual support.

## Features

- **Booking Management**: Automated booking system with real-time availability
- **Google Calendar Sync**: Automatic synchronization of bookings to Google Calendar with 24-hour alerts
- **Multilingual Support**: Internationalized content in multiple languages
- **Responsive Design**: Mobile-first design with modern UI components
- **Payment Integration**: Stripe payment processing for bookings

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun
- Google Cloud Project (for Calendar integration)
- Supabase database

### 1. Clone and Install

```bash
git clone <repository-url>
cd fincaguarumo
npm install
```

### 2. Environment Setup

Create a `.env.local` file with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key

# Google Calendar Integration (Required)
GOOGLE_CALENDAR_ID=primary  # or your specific calendar ID
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=path/to/service-account-key.json

# Calendar Sync Security
CALENDAR_SYNC_SECRET=your_random_secret_key_for_cron_validation

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # for development
```

### 3. Google Calendar Setup

#### Step 1: Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Google Calendar API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

#### Step 2: Service Account Authentication

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
   - Download and save the key file securely (referenced by `GOOGLE_SERVICE_ACCOUNT_KEY_FILE`)

#### Step 3: Calendar Sharing

1. Open your Google Calendar
2. Find the calendar ID (in settings)
3. Share the calendar with the service account email
4. Grant "Make changes to events" permission

### 4. Database Setup

The system automatically creates the `gcal_sync_log` table via migration. For manual setup, run this in Supabase SQL editor:

```sql
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

### 5. Run Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Testing Google Calendar Integration

### Admin Interface Testing

The admin interface provides a user-friendly way to test and monitor calendar sync locally:

1. Start the development server: `npm run dev`
2. Navigate to [http://localhost:3000/admin/calendar-sync](http://localhost:3000/admin/calendar-sync)
3. Use the interface to:
   - Test calendar access
   - Trigger manual sync with different options
   - View sync statistics and recent logs
   - Monitor sync status in real-time

### Direct API Testing

#### Manual Sync Test

```bash
# Perform actual sync
curl -X POST "http://localhost:3000/api/calendar-sync?secret=YOUR_SYNC_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"dryRun": false}'

# Test sync without making changes (dry run)
curl -X POST "http://localhost:3000/api/calendar-sync?secret=YOUR_SYNC_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"dryRun": true}'

# Sync with cleanup (removes logs older than 90 days)
curl -X POST "http://localhost:3000/api/calendar-sync?secret=YOUR_SYNC_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"cleanup": true}'
```

#### Check Sync Status

```bash
# Get current sync statistics and calendar access status
curl "http://localhost:3000/api/calendar-sync?secret=YOUR_SYNC_SECRET"
```

#### API Response Examples

**Successful sync response:**

```json
{
  "status": "success",
  "message": "Calendar sync completed",
  "data": {
    "sync": {
      "total": 5,
      "synced": 4,
      "failed": 1,
      "errors": ["Booking ID: booking_123 - Invalid dates"]
    },
    "options": {
      "cleanup": false,
      "dryRun": false
    },
    "completedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Status check response:**

```json
{
  "status": "success",
  "data": {
    "sync": {
      "totalBookings": 25,
      "syncedBookings": 23,
      "failedBookings": 2,
      "lastSync": "2024-01-15T10:15:00.000Z"
    },
    "calendar": {
      "accessible": true,
      "calendarId": "primary"
    },
    "lastChecked": "2024-01-15T10:30:00.000Z"
  }
}
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run Jest tests
- `npm run test:e2e` - Run Playwright E2E tests
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Deployment

### Netlify Deployment

1. Connect your repository to Netlify
2. Add environment variables in Netlify dashboard:
   - All variables from step 2
   - `NEXT_PUBLIC_SITE_URL=https://yourdomain.com`
3. Deploy the site

The system automatically configures scheduled functions for calendar sync every 15 minutes.

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure service account has calendar access
2. **Invalid Credentials**: Verify environment variables are correctly set
3. **Sync Failures**: Check the `gcal_sync_log` table for error messages
4. **Missing Events**: Verify booking data has valid UIDs

### Debug Information

Check the following for debugging:

- Netlify function logs
- API response logs
- Supabase `gcal_sync_log` table
- Google Calendar API quota usage

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
