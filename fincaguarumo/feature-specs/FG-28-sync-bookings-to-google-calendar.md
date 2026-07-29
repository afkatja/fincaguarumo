---
title: "Sync bookings to Google Calendar with alerts"
linear_key: "FG-28"
status: "draft"
created: "2026-04-17"
updated: "2026-04-17"
---

# FG-28: Sync bookings to Google Calendar with alerts

## Overview

Sync merged bookings to personal Google Calendar via iCal format and add alerts one day in advance.

## User Story

As a property manager, I want confirmed bookings to automatically sync to my personal Google Calendar with advance alerts, so that I can stay informed about upcoming guest arrivals and departures without manual calendar management.

## Requirements

### Functional Requirements

- **FR1**: Automatically sync all merged/confirmed bookings to Google Calendar
- **FR2**: Create alerts/notifications one day before each booking
- **FR3**: Handle booking updates and cancellations in calendar
- **FR4**: Support both check-in and check-out events

### Technical Requirements

- **TR1**: Use existing booking data from `/api/ical/merged` endpoint
- **TR2**: Use Google Calendar API for direct calendar integration
- **TR3**: Implement background sync process (cron-like) to avoid performance impact
- **TR4**: Handle authentication and authorization for private Google Calendar access
- **TR5**: Set default 24-hour alerts for check-in and check-out events
- **TR6**: Implement idempotency using Google Calendar eventId storage
- **TR7**: Add sync state tracking with gcal_synced_at timestamp
- **TR8**: Define cron frequency (every 15 minutes recommended)
- **TR9**: Support both popupReminder and emailReminder alert types
- **TR10**: Include initial backfill strategy for existing bookings

## Acceptance Criteria

### AC1: Booking Sync

- [ ] Background process fetches bookings from existing `/api/ical/merged` endpoint
- [ ] Calendar events include: guest name, check-in/out dates, email, phone, source (airbnb, booking, vrbo)
- [ ] Events are created in private Google Calendar automatically

### AC2: Alert System

- [ ] Google Calendar alerts are automatically set for 24 hours before check-in
- [ ] Google Calendar alerts are automatically set for 24 hours before check-out
- [ ] Alert notifications include: guest name, check-in/check-out times, contact details (email, phone), booking source

### AC3: Data Synchronization

- [ ] Background sync runs periodically without impacting app performance
- [ ] Booking updates (date changes, cancellations) reflect in Google Calendar
- [ ] Cancelled bookings are removed from calendar
- [ ] Modified bookings update existing calendar events

### AC4: Private Calendar Integration

- [ ] Calendar is private (single property, no property identification needed)
- [ ] Only relevant fields are synced: check-in, check-out, name, email, phone, source
- [ ] No iCal file generation needed (direct Google Calendar API integration)

### AC5: Idempotent Sync

- [ ] Re-running sync for an unchanged booking does not create a second Google Calendar event
- [ ] Syncing the same booking twice results in: createEvent ×1, updateEvent ×1
- [ ] On retry after 429 error, the system does not call createEvent again (only updateEvent)
- [ ] When eventExists returns false with existing log, system searches Google Calendar by booking UID before creating new event
- [ ] Missing-event recovery attempts to find existing events via UID search to prevent orphaned events

## Technical Implementation

### Components to Create/Modify

1. **Google Calendar Service** (`src/lib/google-calendar.ts`)
   - Use Google Calendar API for direct calendar integration
   - Handle calendar event creation/modification/deletion
   - Manage 24-hour alerts automatically
   - Authenticate with private calendar access

2. **Background Sync Service** (`src/lib/calendar-sync.ts`)
   - Decoupled background process for calendar updates
   - Use existing `/api/ical/merged` endpoint to fetch booking data
   - Schedule periodic sync (cron-like) to avoid performance impact
   - Handle booking updates and cancellations

3. **Booking Integration**
   - Hook into existing booking system to trigger calendar updates
   - Use existing Supabase booking data (check-in, check-out, guest name, email, phone, source)
   - Filter for relevant fields only: dates, name, email, phone, source (airbnb, booking, vrbo)

4. **Configuration**
   - Google Calendar credentials and settings
   - Sync frequency settings
   - Alert timing (fixed 24 hours)

### Dependencies

- Google Calendar API client library
- Existing booking data from `/api/ical/merged`
- Background job scheduling (Vercel Cron Jobs or similar)

### Data Flow

1. Background job triggers →
2. Fetch bookings from existing `/api/ical/merged` endpoint →
3. Filter for relevant fields (check-in, check-out, name, email, phone, source) →
4. Create/update events in private Google Calendar via API →
5. 24-hour alerts are automatically set by Google Calendar

## Authentication Strategy

- **OAuth 2.0 Flow**: One-time setup for private Google Calendar access
- **Token Storage**: Secure storage in Supabase secrets or Netlify environment variables
- **Service Account Option**: Consider Google Service Account with calendar sharing for simpler implementation
- **Token Refresh**: Handle automatic token refresh for long-running sync process

## Sync State & Idempotency

- **New Supabase Table**: `gcal_sync_log` with columns:
  - `id` (primary key)
  - `booking_id` (foreign key to bookings table)
  - `gcal_event_id` (Google Calendar event ID for updates/deletes)
  - `synced_at` (timestamp of last successful sync)
  - `status` (success/failed/pending)
  - `error_message` (failure details)

## Edge Cases & Error Handling

- **Network failures**: Retry mechanism with exponential backoff
- **Invalid booking data**: Validation before calendar creation
- **Calendar quota limits**: Rate limiting and API usage monitoring
- **Timezone handling**: Proper timezone conversion for events
- **Duplicate events**: Idempotency using gcal_event_id storage
- **Token expiration**: Automatic refresh and re-authentication flows

## Testing Strategy

- Unit tests for Google Calendar API integration
- Integration tests for booking → calendar sync workflow
- E2E tests for complete sync workflow
- Mock Google Calendar API for testing
- Performance tests for large booking volumes
- OAuth flow testing for authentication setup

## Cron Frequency & Background Processing

- **Recommended Frequency**: Every 15 minutes (balances real-time updates with API quota limits)
- **Netlify Cron Jobs**: Use Netlify scheduled functions for background sync
- **Initial Backfill**: One-time import of existing bookings on first deployment
- **Rate Limiting**: Implement exponential backoff for API failures

## Alert Implementation Details

- **popupReminder**: In-app notification 24 hours before check-in/check-out
- **emailReminder**: Email alert 24 hours before check-in/check-out
- **Alert Content**: Include guest name, contact details, booking source, dates

## Success Metrics

- 100% of merged bookings appear in calendar within 5 minutes
- Zero duplicate calendar events
- Alert accuracy rate > 99%
- Calendar subscription reliability > 99.9%

## Notes & Assumptions

- Assumes existing booking system with status management
- Assumes user has Google Calendar access
- Calendar sync is one-way (system → Google Calendar)
- No requirement for two-way sync (calendar → system)
