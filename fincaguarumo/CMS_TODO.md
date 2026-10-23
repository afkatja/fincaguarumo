# CMS Content Tasks (Sanity Studio)

These items require content changes in Sanity Studio. Do NOT implement in code.

## Translations (Critical for SEO)

### Spanish (es) - Currently serves English content
- [ ] Translate all pages: Home, Villa Bruno, About, FAQ, Reviews, Tours, Contact
- [ ] Translate blog posts OR mark as English-only with proper hreflang
- [ ] Translate tour descriptions
- [ ] Translate accommodation details
- [ ] Add Spanish FAQ entries

### German (de) - Currently serves English content
- [ ] Translate all pages: Home, Villa Bruno, About, FAQ, Reviews, Tours, Contact
- [ ] Translate blog posts OR mark as English-only
- [ ] Translate tour descriptions
- [ ] Translate accommodation details

### Dutch (nl) - Currently serves English content
- [ ] Translate all pages: Home, Villa Bruno, About, FAQ, Reviews, Tours, Contact
- [ ] Translate blog posts OR mark as English-only
- [ ] Translate tour descriptions
- [ ] Translate accommodation details

### Russian (ru) - Currently serves English content
- [ ] Translate all pages: Home, Villa Bruno, About, FAQ, Reviews, Tours, Contact
- [ ] Translate blog posts OR mark as English-only
- [ ] Translate tour descriptions
- [ ] Translate accommodation details

## SEO Fields (Per Page)

### Homepage
- [ ] Add OpenGraph image specific to homepage (currently uses generic)
- [ ] Add Twitter card image

### Villa Bruno Page
- [ ] Add `openGraph` fields in Sanity: title, description, image
- [ ] Add Twitter card fields
- [ ] Ensure `description` field is populated (used for meta description)
- [ ] Add `keywords` field (optional, for internal reference)

### Tour Pages
- [ ] Add `openGraph` fields per tour
- [ ] Add `description` for each tour
- [ ] Add `duration` field (already exists, verify populated)
- [ ] Add `price` field (already exists, verify populated)
- [ ] Add `location` field
- [ ] Add `geo` coordinates for each tour

### Blog Posts
- [ ] Add `publishedAt` date (currently missing in structured data)
- [ ] Add `description` field for meta description
- [ ] Add `openGraph` image, title, description per post
- [ ] Add author information (currently hardcoded as Organization)
- [ ] Add `categories` for articleSection

### FAQ Page
- [ ] Ensure all FAQs have `answerBlockContent` or `answer` populated
- [ ] Add `displayOrder` for consistent ordering
- [ ] Add category for better organization

### About Page
- [ ] Add `description` for meta
- [ ] Add OpenGraph image
- [ ] Add sustainability content for structured data

### Reviews Page
- [ ] Add `description` for meta
- [ ] Add OpenGraph image

### Contact Page
- [ ] Add `description` for meta
- [ ] Add OpenGraph image

### Gallery Page
- [ ] Add `description` for meta
- [ ] Add OpenGraph image
- [ ] Consider noindex if thin content

## Images

### Hero Images
- [ ] Ensure all hero images have proper `alt` text in Sanity
- [ ] Verify poster images for video backgrounds
- [ ] Add width/height metadata for CLS prevention

### Villa Bruno Images
- [ ] Add `alt` text to all accommodation images
- [ ] Add `caption` where appropriate

### Tour Images
- [ ] Add `alt` text to all tour images
- [ ] Add `caption` where appropriate

### Blog Post Images
- [ ] Add `alt` text to all blog post images
- [ ] Ensure mainImage has alt text

## Structured Data Content

### LodgingBusiness (Homepage & Villa Bruno)
- [ ] Verify address: "6 km from Puerto Jiménez, Puerto Jiménez, Puntarenas, 60702, CR"
- [ ] Verify geo coordinates: 8.496420632614996, -83.3341457939961
- [ ] Add Google Business Profile URL when available
- [ ] Add Airbnb URL when available
- [ ] Add Booking.com URL when available
- [ ] Add TripAdvisor URL when available

### Organization
- [ ] Verify logo URL: https://fincaguarumo.com/logo.png
- [ ] Add foundingDate: "2023"
- [ ] Verify social media URLs (Instagram, Facebook, YouTube)

### TouristTrip (Tours)
- [ ] Add `duration` in ISO 8601 format (e.g., "PT4H" for 4 hours)
- [ ] Add `itinerary` text from tour body content
- [ ] Add `touristType` if applicable

## Pages to Create (if not existing)

- [ ] `/location` or `/how-to-get-here` page with directions
- [ ] `/contact` page (verify exists with form)
- [ ] `/gallery` page - verify content quality or noindex

## Technical

- [ ] Add `sitemap.xml` reference to robots.txt (done in code)
- [ ] Verify `lastmod` dates are accurate from Sanity `_updatedAt`
- [ ] Add `hreflang` annotations for all translated pages

## Priority Order

1. **High**: Spanish translations (largest non-English market)
2. **High**: German translations
3. **Medium**: Dutch translations
4. **Medium**: Russian translations
5. **High**: SEO fields for Villa Bruno, Tours, Blog
6. **Medium**: SEO fields for other pages
7. **Low**: Gallery page content/noindex decision