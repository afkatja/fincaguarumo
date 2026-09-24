# Google Business Profile API Setup Guide

This guide will help you set up the Google Business Profile API to fetch all reviews (not just the 5 limited by the Places API).

## Overview

The Google Business Profile (GBP) API allows you to fetch **all reviews** from your GBP account, unlike the Places API which is limited to 5 reviews per location.

**Current Architecture:**
- **Google Maps (Places API)**: Display map, location details, place info (name, address, rating) — **no reviews**
- **GBP API**: Fetch all reviews (unlimited) for the single location

### Data Source Separation (Decoupling)

| Data | Source | Reason |
|------|--------|--------|
| Map, marker, place name, address, overall rating | Places API (`PlaceProvider`) | Native map integration, real-time location data |
| Individual reviews, review count, reviewer details | GBP API (`ReviewsProvider`) | Unlimited reviews, rich metadata, no 5-review limit |

**Places API reviews are deprecated** — do not use `reviews` field from `PlaceProvider`. All review-dependent components must migrate to `ReviewsProvider`.

## Prerequisites

1. Google Business Profile account with at least one location (Finca Guarumo)
2. Google Cloud Project
3. Admin access to the GBP account

## Step-by-Step Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable billing for the project (required for GBP API)

### 2. Enable Google My Business API

1. In your Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google My Business API"
3. Click "Enable"

### 3. Create a Service Account

1. Go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Give it a name (e.g., "fincaguarumo-gbp-api")
4. Grant it the role of "Project Viewer" (minimum required)
5. Skip the "Grant this service account access to project" step

### 4. Create and Download JSON Key

1. Find your service account in the list
2. Click on the three dots > "Manage keys"
3. Click "Add Key" > "Create new key"
4. Select "JSON" and click "Create"
5. Download the JSON file and keep it secure

### 5. Share GBP Access with Service Account

1. Copy the service account email (looks like: `service-account-name@project-id.iam.gserviceaccount.com`)
2. Go to your [Google Business Profile](https://business.google.com/)
3. Select the Finca Guarumo location
4. Go to "Users" > "Add users"
5. Add the service account email with "Manager" role

### 6. Configure Environment Variables

**Recommended approach (avoids JSON escaping issues on Netlify):**

#### For Development (.env.local)

```bash
# Extract these from your downloaded JSON key
GCP_SERVICE_ACCOUNT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
GCP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GCP_PROJECT_ID=your-project-id
```

#### For Netlify (Environment Variables)

1. Go to your Netlify site settings
2. Go to "Build & deploy" > "Environment"
3. Add these three variables:
   - `GCP_SERVICE_ACCOUNT_EMAIL`
   - `GCP_PRIVATE_KEY` (paste the entire private key including `\n` newlines)
   - `GCP_PROJECT_ID`

### 7. Find Your Location ID

Use the API to discover your location ID:

```bash
curl -X GET "http://localhost:3000/api/gbp/locations"
```

This will return your account and location information. Note the `name` field for the location (e.g., `accounts/123456789/locations/987654321`).

### 8. Update Your Application

Once you have your location ID, add it to your environment:

```bash
# .env.local
GBP_LOCATION_ID=accounts/123456789/locations/987654321
```

Then use the new `ReviewsProvider` (separate from map provider):

```tsx
// In your component
import { PlaceProvider } from '@/app/providers/PlaceProvider'  // Map + basic info
import { ReviewsProvider } from '@/app/providers/ReviewsProvider'  // GBP reviews

// Wrap both providers
<PlaceProvider placeId="YOUR_GOOGLE_PLACE_ID">
  <ReviewsProvider locationId={process.env.GBP_LOCATION_ID!}>
    <YourReviewsComponent />
  </ReviewsProvider>
</PlaceProvider>
```

## Architecture

### PlaceProvider (unchanged)
- Uses `@vis.gl/react-google-maps` (Places API)
- Fetches: `displayName`, `formattedAddress`, `rating`, `placeId`
- Renders the map with marker
- **Does NOT fetch reviews**

### ReviewsProvider (new)
- Server-side fetches from `/api/gbp/reviews`
- Returns all reviews from GBP API
- Provides: `reviews`, `loading`, `error`
- Client-side only, no map dependencies

### API Routes (new)
- `GET /api/gbp/locations` - List all accessible locations (for discovery)
- `GET /api/gbp/reviews?locationId=...` - Fetch all reviews for a location

## OAuth2 Implementation

The GBP API uses JWT-based service account authentication.

```typescript
// src/lib/gbp/client.ts
import { JWT } from 'google-auth-library'

export async function getAccessToken(): Promise<string> {
  const jwtClient = new JWT({
    email: process.env.GCP_SERVICE_ACCOUNT_EMAIL!,
    key: process.env.GCP_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/business.manage'],
  })

  const tokens = await jwtClient.authorize()
  return tokens.access_token!
}
```

Install the dependency:
```bash
npm install google-auth-library
```

## API Endpoints

### GET /api/gbp/locations
Returns list of locations accessible by the service account.

Response:
```json
{
  "locations": [
    {
      "name": "accounts/123456789/locations/987654321",
      "title": "Finca Guarumo",
      "address": "...",
      "phoneNumber": "..."
    }
  ]
}
```

### GET /api/gbp/reviews?locationId=accounts/.../locations/...
Returns all reviews for the location.

Query params:
- `locationId` (required): GBP location resource name
- `pageSize` (optional, default 50): Reviews per page
- `pageToken` (optional): For pagination

Response:
```json
{
  "reviews": [
    {
      "name": "accounts/.../locations/.../reviews/...",
      "reviewer": {
        "profilePhotoUrl": "...",
        "displayName": "John Doe",
        "isAnonymous": false
      },
      "starRating": "FIVE",
      "comment": "Amazing stay!",
      "createTime": "2024-01-15T10:30:00Z",
      "updateTime": "2024-01-15T10:30:00Z"
    }
  ],
  "nextPageToken": "..."
}
```

## Testing

1. Start your development server
2. Visit `/api/gbp/locations` to verify you can access your location
3. Visit `/api/gbp/reviews?locationId=accounts/.../locations/...` to test fetching reviews
4. Check your browser console for any errors

## Troubleshooting

### Common Issues

1. **"Access denied"**: Make sure the service account has Manager access to your GBP location
2. **"API not enabled"**: Ensure the Google My Business API is enabled in your Cloud Console
3. **"Invalid credentials"**: Verify the service account key is correctly formatted and accessible
4. **"No locations found"**: Check that the service account email has been added as a user in GBP

### Debug Mode

Add debug logging to your API routes:

```typescript
console.log('Service account email configured:', !!process.env.GCP_SERVICE_ACCOUNT_EMAIL)
console.log('Private key configured:', !!process.env.GCP_PRIVATE_KEY)
console.log('Attempting to access location:', locationId)
```

## Security Notes

- Never commit your service account key to version control
- Use environment variables in production
- Regularly rotate your service account keys
- Monitor API usage in your Google Cloud Console

## API Limits

- GBP API has higher quotas than Places API
- Standard quota: 60,000 queries per day
- Each location can have unlimited reviews fetched
- Implement caching to reduce API calls (recommended: 1-hour cache)

## Implementation Checklist

- [ ] Create Google Cloud Project & enable GBP API
- [ ] Create service account & download JSON key
- [ ] Add service account as Manager in GBP
- [ ] Add env vars (GCP_SERVICE_ACCOUNT_EMAIL, GCP_PRIVATE_KEY, GCP_PROJECT_ID, GBP_LOCATION_ID)
- [ ] Install `google-auth-library`
- [ ] Create `src/lib/gbp/client.ts` with `getAccessToken()`
- [ ] Create `src/app/api/gbp/locations/route.ts`
- [ ] Create `src/app/api/gbp/reviews/route.ts`
- [ ] Create `src/app/providers/ReviewsProvider.tsx`
- [ ] Update components to use both providers
- [ ] Test and verify all reviews display

## Phased Migration Plan

### Phase 1: Infrastructure (No UI Changes)
- [ ] Set up GCP project, service account, GBP access
- [ ] Create API routes with caching
- [ ] Verify `/api/gbp/reviews` returns all reviews

### Phase 2: ReviewsProvider + Parallel Run
- [ ] Create `ReviewsProvider` fetching from `/api/gbp/reviews`
- [ ] Wrap existing review components with BOTH providers
- [ ] Compare Places API reviews (5) vs GBP API reviews (all)
- [ ] Verify data consistency

### Phase 3: Switch Review Components
- [ ] Update each review component to use `useReviews()` instead of `usePlace().reviews`
- [ ] Components to migrate:
  - [ ] `ReviewsCarousel` / `ReviewList`
  - [ ] `ReviewSummary` / rating display
  - [ ] Any component showing review count
- [ ] Remove `reviews` from `PlaceDetails` type in `PlaceProvider`

### Phase 4: Cleanup
- [ ] Remove `reviews` field from Places API request in `PlaceProvider`
- [ ] Remove `reviews` from `PlaceDetails` type
- [ ] Update any remaining references
- [ ] Run full test suite

## Caching Strategy (1-Hour TTL)

### Next.js Route Handler Caching (Recommended)

```typescript
// src/app/api/gbp/reviews/route.ts
export const revalidate = 3600 // 1 hour ISR

export async function GET(request: NextRequest) {
  // ... fetch logic
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    },
  })
}
```

### Alternative: In-Memory Cache with TTL

```typescript
// src/lib/gbp/cache.ts
interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<any>>()
const TTL_MS = 60 * 60 * 1000 // 1 hour

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry || Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.data
}

export function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + TTL_MS })
}
```

### Cache Keys

- `gbp:reviews:{locationId}:page={pageToken}` - Per-page reviews
- `gbp:locations` - Location list

## Error Handling & Rate Limits

### GBP API Quotas
- 60,000 queries/day per project
- 1,200 queries/minute per project
- 100 queries/second per user

### Rate Limit Handling

```typescript
// src/lib/gbp/client.ts
import { JWT } from 'google-auth-library'

const RATE_LIMIT_DELAY_MS = 1000 // 1 second between requests
let lastRequestTime = 0

async function rateLimitedFetch<T>(fn: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  
  if (timeSinceLastRequest < RATE_LIMIT_DELAY_MS) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS - timeSinceLastRequest))
  }
  
  lastRequestTime = Date.now()
  return fn()
}

export async function fetchAllReviews(locationId: string): Promise<GBPReview[]> {
  return rateLimitedFetch(async () => {
    const accessToken = await getAccessToken()
    
    const response = await fetch(
      `https://mybusiness.googleapis.com/v4/${locationId}/reviews`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )
    
    if (response.status === 429) {
      // Rate limited - retry after delay
      const retryAfter = response.headers.get('Retry-After')
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5000
      await new Promise(resolve => setTimeout(resolve, delay))
      return fetchAllReviews(locationId) // Retry once
    }
    
    if (!response.ok) {
      throw new Error(`GBP API error: ${response.status} ${response.statusText}`)
    }
    
    return response.json()
  })
}
```

### Error Response Format

```typescript
// API routes return consistent error format
{
  "error": {
    "code": "RATE_LIMITED" | "UNAUTHORIZED" | "NOT_FOUND" | "INTERNAL_ERROR",
    "message": "Human-readable message",
    "retryAfter": 60 // seconds, only for rate limits
  }
}
```

### Client-Side Error Handling

```tsx
// ReviewsProvider.tsx
const { reviews, loading, error } = useReviews()

if (error) {
  if (error.code === 'RATE_LIMITED') {
    return <div>Too many requests. Retrying in {error.retryAfter}s...</div>
  }
  return <div>Failed to load reviews: {error.message}</div>
}
```

## Webhook Support (Real-Time Updates)

### Overview

GBP API supports [push notifications](https://developers.google.com/my-business/reference/rest/v4/accounts.notifications) for real-time review updates.

### Setup

1. **Create a pub/sub topic** in Google Cloud:
   ```bash
   gcloud pubsub topics create gbp-review-notifications
   ```

2. **Register notification subscription**:
   ```bash
   curl -X POST "https://mybusiness.googleapis.com/v4/accounts/ACCOUNT_ID/subscriptions" \
     -H "Authorization: Bearer $(gcloud auth print-access-token)" \
     -H "Content-Type: application/json" \
     -d '{
       "topicName": "projects/PROJECT_ID/topics/gbp-review-notifications",
       "notificationTypes": ["NEW_REVIEW", "UPDATED_REVIEW", "DELETED_REVIEW"]
     }'
   ```

3. **Create webhook endpoint** (Netlify Function or Next.js API route):

```typescript
// src/app/api/gbp/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Verify message is from GBP (check message.attributes)
    const message = body.message
    if (!message?.attributes?.locationName) {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 })
    }
    
    const locationName = message.attributes.locationName
    const notificationType = message.attributes.notificationType
    
    // Invalidate cache for this location
    invalidateReviewsCache(locationName)
    
    // Optionally: fetch and store new review immediately
    if (notificationType === 'NEW_REVIEW') {
      await fetchAndCacheLatestReview(locationName)
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function invalidateReviewsCache(locationName: string) {
  // Clear in-memory cache
  // Or trigger Next.js revalidate via on-demand revalidation
  // await res.revalidate(`/api/gbp/reviews?locationId=${locationName}`)
}
```

4. **Deploy webhook URL** and register with GBP (see step 2)

### Benefits

- Cache invalidation on new/updated/deleted reviews
- Real-time review display without polling
- Reduced API calls (only fetch when changes occur)

### Note

Webhooks require a publicly accessible HTTPS endpoint. For local development, use ngrok or similar tunnel.

## Security Notes (Updated)

- Never commit service account key to version control
- Use environment variables in production
- Regularly rotate service account keys (quarterly)
- Monitor API usage in Google Cloud Console
- Restrict service account IAM roles to minimum needed
- Validate webhook messages origin (check `message.attributes`)

## Next Steps

Once set up, you'll be able to:
- Fetch all reviews from Finca Guarumo (no 5-review limit)
- Display the complete review count
- Keep reviews synchronized automatically via API
- Decouple reviews from map provider for better performance