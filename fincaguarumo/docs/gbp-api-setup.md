# Google Business Profile API Setup Guide

This guide will help you set up the Google Business Profile API to fetch all reviews (not just the 5 limited by the Places API).

## Overview

The Google Business Profile (GBP) API allows you to fetch **all reviews** from your GBP accounts, unlike the Places API which is limited to 5 reviews per location.

## Prerequisites

1. Google Business Profile account with at least one location
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
5. Skip the "Grant this service account access to project" step for now

### 4. Create and Download JSON Key

1. Find your service account in the list
2. Click on the three dots > "Manage keys"
3. Click "Add Key" > "Create new key"
4. Select "JSON" and click "Create"
5. Download the JSON file and keep it secure

### 5. Share GBP Access with Service Account

1. Copy the service account email (looks like: `service-account-name@project-id.iam.gserviceaccount.com`)
2. Go to your [Google Business Profile](https://business.google.com/)
3. Select the location(s) you want to manage
4. Go to "Users" > "Add users"
5. Add the service account email with "Manager" role
6. Repeat for each location you want to access

### 6. Configure Environment Variables

Add the service account key to your environment:

#### For Development (.env.local)

```bash
# Add the entire JSON key as a single line (escaped)
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"service-account@project-id.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/service-account%40project-id.iam.gserviceaccount.com"}'
```

#### For Netlify (Environment Variables)

1. Go to your Netlify site settings
2. Go to "Build & deploy" > "Environment"
3. Add the `GOOGLE_SERVICE_ACCOUNT_KEY` variable with the JSON content

### 7. Find Your Location IDs

Use the API to discover your location IDs:

```bash
curl -X GET "http://localhost:3000/api/gbp/locations"
```

This will return your account and location information. Note the `name` field for each location (e.g., `accounts/123456789/locations/987654321`).

### 8. Update Your Application

Once you have your location IDs, you can update your application to use the GBP API:

```typescript
// In your component
const locationIds = [
  'accounts/123456789/locations/987654321', // Villa Bruno
  'accounts/123456789/locations/123456789', // Finca Guarumo
]

// Use the enhanced PlaceProvider
<EnhancedPlaceProvider 
  placeId={placeId} 
  enableGBP={true}
  gbpLocationIds={locationIds}
>
  <YourReviewsComponent />
</EnhancedPlaceProvider>
```

## OAuth2 Implementation

The current API routes include a placeholder for OAuth2 authentication. You'll need to implement the JWT authentication flow. Here's what you need to add to the `getAccessToken()` function:

```typescript
import { JWT } from 'google-auth-library'

async function getAccessToken(): Promise<string> {
  const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!)
  
  const jwtClient = new JWT({
    email: serviceAccountKey.client_email,
    key: serviceAccountKey.private_key,
    scopes: ['https://www.googleapis.com/auth/business.manage'],
  })

  const tokens = await jwtClient.authorize()
  return tokens.access_token!
}
```

You'll need to install the Google Auth Library:

```bash
npm install google-auth-library
```

## Testing

1. Start your development server
2. Visit `/api/gbp/locations` to verify you can access your locations
3. Visit `/api/gbp/reviews?locationId=accounts/.../locations/...` to test fetching reviews
4. Check your browser console for any errors

## Troubleshooting

### Common Issues

1. **"Access denied"**: Make sure the service account has Manager access to your GBP locations
2. **"API not enabled"**: Ensure the Google My Business API is enabled in your Cloud Console
3. **"Invalid credentials"**: Verify the service account key is correctly formatted and accessible
4. **"No locations found"**: Check that the service account email has been added as a user in GBP

### Debug Mode

Add debug logging to your API routes:

```typescript
console.log('Service account configured:', !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
console.log('Attempting to access:', locationId)
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
- Implement caching to reduce API calls

## Next Steps

Once set up, you'll be able to:
- Fetch all reviews from both Villa Bruno and Finca Guarumo
- Display the complete review count (13 instead of 5)
- Combine reviews from multiple locations
- Keep reviews synchronized automatically
