---
description: Migrate Villa Bruno page content to new accommodationType schema
---

# Villa Bruno Migration Workflow

This workflow migrates the existing Villa Bruno page content from the `/stay` slug to the new `accommodationType` schema with all relevant fields and translations.

## Prerequisites

1. Ensure the new `accommodationType` schema is properly configured in Sanity
2. Verify that the Sanity client configuration is working
3. Have environment variables set up for Sanity access

## Migration Steps

### 1. Dry Run (Recommended)

First, run a dry run to preview what will be migrated:

```bash
npm run migrate:villa-bruno:dry-run
```

This will:
- Find all Villa Bruno pages with slug `stay`
- Display the content that will be migrated
- **Not make any changes to your data**

### 2. Execute Migration

Once you've reviewed the dry run output, execute the actual migration:

```bash
npm run migrate:villa-bruno
```

This will:
- Create new `accommodation` documents for each language version
- Map all compatible fields from the original page
- Add Villa Bruno specific defaults (capacity, location, features, etc.)
- **Keep the original page documents intact** for verification

### 3. Verification

After migration:

1. **Check Sanity Studio**: Navigate to the "Accommodation Page" type and verify the new documents
2. **Test on Website**: Visit the new accommodation pages to ensure they render correctly
3. **Populate References**: Add amenities, pricing rules, payment methods, etc. as needed
4. **Review Content**: Ensure all translations and content migrated correctly

### 4. Clean Up (Optional)

Once you've verified everything works correctly, you can delete the original page documents:

1. In Sanity Studio, find the original Villa Bruno page(s)
2. Delete them manually or use the provided IDs from the migration output
3. **Important**: Only delete after thorough testing

## Field Mapping

The migration automatically maps these fields:

| Page Field | Accommodation Field | Notes |
|------------|-------------------|-------|
| `title` | `title` | Direct mapping |
| `subtitle` | `subtitle` | Direct mapping |
| `description` | `description` | Direct mapping |
| `mainImage` | `mainImage` | Direct mapping |
| `slideshow` | `slideshow` | Direct mapping |
| `categories` | `categories` | Direct mapping |
| `body` | `body` | Direct mapping |
| `isPublished` | `isPublished` | Direct mapping |
| `price` | `price` | Direct mapping |
| `showBookingOptions` | `showBookingOptions` | Defaults to `true` |
| `showFAQ` | `showFAQ` | Defaults to `true` |
| `faq` | `faq` | Direct mapping |
| `showBookingDialog` | `showBookingDialog` | Defaults to `true` |
| `displayReviews` | `displayReviews` | Defaults to `true` |

## New Fields Added

The migration adds these Villa Bruno specific fields:

- `capacity`: 4 (max guests)
- `bedrooms`: 1
- `bathrooms`: 1
- `propertyType`: "villa"
- `location`: Puerto Jiménez, Costa Rica coordinates
- `checkInTime`: "3:00 PM"
- `checkOutTime`: "11:00 AM"
- `highlightFeatures`: Solar power, wildlife, spring water, ocean views
- `slug`: Changes from "stay" to "villa-bruno"

## Rollback Plan

If you need to rollback:

1. The original page documents are preserved until you manually delete them
2. You can delete the new accommodation documents in Sanity Studio
3. No automated rollback is provided to prevent accidental data loss

## Troubleshooting

### No Villa Bruno pages found
- Check that the page has slug `stay`
- Verify the page type is `page`
- Use the fallback search to find any Villa Bruno pages

### Migration fails
- Check Sanity client configuration
- Verify environment variables
- Check network connectivity to Sanity API

### Content missing after migration
- Verify the original page had the content
- Check field mapping in the script
- Manually populate missing fields in Sanity Studio

## Safety Features

- **Idempotent**: Running multiple times won't create duplicates
- **Dry Run**: Preview changes before executing
- **Preservation**: Original documents kept until verified
- **Logging**: Detailed output for troubleshooting
