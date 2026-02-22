# Property Schema Setup Guide

## Overview
We've created a new `propertyType` schema to replace hard-coded property data in the chatbot's hallucination detection system.

## Changes Made

### 1. New Property Schema (`src/sanity/schemaTypes/propertyType.ts`)
- **propertyType**: Villa, House, Apartment, Cabin
- **capacity**: maxGuests, bedrooms, bathrooms
- **locationDetails**: address, region, country, coordinates, proximity
- **propertyOverview**: title, subtitle, description, features, highlights
- **keyFeatures**: Array of key selling points
- **amenities**: References to amenities documents
- **price**: Base price per night
- **images**: Property images
- **mainImage**: Primary property image
- **isPublished**: Publication status

### 2. Updated Schema Registry (`src/sanity/schema.ts`)
- Added `propertyType` import and export
- Added to schema types array

### 3. Updated Data Extractor (`src/lib/sanity-data-extractor.ts`)
- Modified `extractPropertyConfig()` to query the new `property` schema
- Removed hard-coded values
- Now fetches real data from Sanity CMS

### 4. Migration Script (`scripts/migrate-property-data.ts`)
- Creates property document from existing Villa Bruno page data
- Populates all fields with real property information
- Idempotent (uses fixed `_id`)

## Next Steps

### 1. Run Migration Script
```bash
npx tsx scripts/migrate-property-data.ts
```

### 2. Update Amenities in Sanity Studio
1. Go to Sanity Studio (`/studio`)
2. Open the new "Property" document
3. Add amenity references to the amenities field
4. Save and publish

### 3. Test Chatbot
The chatbot hallucination detection should now work with real data:
- **Capacity**: 4 guests (from property.capacity.maxGuests)
- **Features**: Real property features (from property.keyFeatures)
- **Location**: Actual location details (from property.locationDetails)
- **Amenities**: Linked amenities (from property.amenities)

## Benefits
- ✅ **No more hard-coded data** - All property info comes from CMS
- ✅ **Proper hallucination detection** - Ground truth contains real values
- ✅ **Easy maintenance** - Update property info in Sanity Studio
- ✅ **Multiple properties** - Schema supports multiple property types
- ✅ **Rich data structure** - Detailed location and overview information

## Schema Fields Reference

| Field | Type | Description | Example |
|--------|------|-------------|---------|
| propertyType | String | Property classification | "villa" |
| capacity.maxGuests | Number | Maximum guests allowed | 4 |
| capacity.bedrooms | Number | Number of bedrooms | 2 |
| capacity.bathrooms | Number | Number of bathrooms | 1 |
| locationDetails.address | String | Property address | "6 km from Puerto Jiménez" |
| locationDetails.region | String | Geographic region | "Osa Peninsula, Costa Rica" |
| keyFeatures | Array | Key selling points | ["Solar powered", "Wildlife viewing"] |
| price | Number | Base price per night | 115 |

## Validation
The schema includes proper validation:
- Required fields: propertyType, title, description, capacity, keyFeatures
- Min/max constraints: maxGuests (1-20), bedrooms (0+), bathrooms (0+)
- Published status control via isPublished boolean
