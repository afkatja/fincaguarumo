# Plan: Update Image Type in Sanity with Optional Fields

## Overview

Create a reusable image type in Sanity with optional `author` and `url` (source) fields that can be referenced by other schema types.

## Current State Analysis

### Existing Image Usage Patterns

Images are currently defined inline in multiple schema types with custom `alt` fields:

| Schema Type           | Image Field               | Current Implementation              |
| --------------------- | ------------------------- | ----------------------------------- |
| `postType.ts`         | `mainImage`               | Inline image with `alt` field       |
| `tourType.ts`         | `mainImage`               | Inline image with `alt` field       |
| `pageType.ts`         | `mainImage`               | Inline image with `alt` field       |
| `galleryType.ts`      | `images`                  | Array of inline images with hotspot |
| `blockContentType.ts` | inline image              | Array member with `alt` field       |
| `homeType.ts`         | `background_media_poster` | Inline image with hotspot           |

### Current Image Field Structure

```typescript
{
  type: "image",
  options: { hotspot: true },
  fields: [
    {
      name: "alt",
      type: "string",
      title: "Alternative text",
    },
  ],
}
```

## Proposed Solution

### 1. Create New `imageType.ts`

Create a reusable image type definition at `src/sanity/schemaTypes/imageType.ts`:

```typescript
import { defineType, defineField } from "sanity"

export const imageType = defineType({
  name: "imageWithMetadata",
  title: "Image",
  type: "image",
  options: {
    hotspot: true,
  },
  fields: [
    defineField({
      name: "alt",
      type: "string",
      title: "Alternative text",
      description: "Descriptive text for accessibility and SEO",
    }),
    defineField({
      name: "author",
      type: "string",
      title: "Author",
      description: "Optional: Image author/photographer name",
    }),
    defineField({
      name: "url",
      type: "url",
      title: "Source URL",
      description: "Optional: Source URL where the image was obtained",
    }),
  ],
})
```

### 2. Update Schema Types to Reference the New Image Type

#### Files to Update:

1. **`src/sanity/schemaTypes/postType.ts`**
   - Update `mainImage` field (line 38-50)
   - Update `openGraph.image` field (line 91-106)

2. **`src/sanity/schemaTypes/tourType.ts`**
   - Update `mainImage` field (line 71-83)

3. **`src/sanity/schemaTypes/pageType.ts`**
   - Update `mainImage` field (line 41-53)

4. **`src/sanity/schemaTypes/galleryType.ts`**
   - Update `images` array (line 17-31)

5. **`src/sanity/schemaTypes/blockContentType.ts`**
   - Update inline image array member (line 81-92)

6. **`src/sanity/schemaTypes/homeType.ts`**
   - Update `background_media_poster` field (line 45-51)

### 3. Register the New Image Type

Update `src/sanity/schema.ts` to import and register the new `imageType`.

## Implementation Details

### New Image Type Structure

The new image type will include:

- **Required**: Sanity's built-in image functionality (asset, hotspot)
- **Optional**: `alt` text (for accessibility)
- **Optional**: `author` (photographer/creator name)
- **Optional**: `url` (source URL for attribution)

### Usage Pattern

After implementation, schema types will reference the image type like this:

```typescript
// For single image fields
defineField({
  name: "mainImage",
  type: "imageWithMetadata",
})

// For image arrays
defineField({
  name: "images",
  type: "array",
  of: [{ type: "imageWithMetadata" }],
})
```

## Benefits

1. **Consistency**: All images across the CMS will have the same metadata structure
2. **Maintainability**: Changes to image fields only need to be made in one place
3. **Attribution Support**: Optional author and source fields enable proper image attribution
4. **SEO & Accessibility**: Consistent alt text handling across all images

## Migration Considerations

- Existing images will automatically gain the new optional fields
- No data migration required as new fields are optional
- Existing content will continue to work without modification

## Files to Create/Modify

### Create:

- `src/sanity/schemaTypes/imageType.ts`

### Modify:

- `src/sanity/schemaTypes/postType.ts`
- `src/sanity/schemaTypes/tourType.ts`
- `src/sanity/schemaTypes/pageType.ts`
- `src/sanity/schemaTypes/galleryType.ts`
- `src/sanity/schemaTypes/blockContentType.ts`
- `src/sanity/schemaTypes/homeType.ts`
- `src/sanity/schema.ts`
