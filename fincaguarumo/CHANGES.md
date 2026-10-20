# Phase 2 SEO Fixes - Changes Summary

Date: 2026-10-19
Branch: fix/seo-phase2

## Overview
Implemented all Phase 2 fixes based on the technical SEO audit. All changes are code-only; content/CMS changes are documented in `CMS_TODO.md`.

---

## A. Redirects Fixed

### next.config.mjs
- Added permanent (308) redirect for double-locale `/en/en/*` → `/en/*`
- All blog redirects for non-English locales already use 308 permanent
- Locale middleware (`localePrefix: "as-needed"`) correctly serves English at root `/`

### Behavior
| URL | Before | After |
|-----|--------|-------|
| `/` | 200 (English) | 200 (English, canonical) |
| `/en` | 307 → `/` | 308 → `/` (via middleware) |
| `/en/` | 307 → `/` | 308 → `/` (via middleware) |
| `/en/en/*` | 307 chain | 308 → `/en/*` → 308 → `/` |
| `/es/blog` | 308 → `/en/blog` | 308 → `/en/blog` |
| `/es/*` | 308 → `/es` | 308 → `/es` (serves English - needs translation) |

---

## B. Noindex Cleanup

### robots.ts
- Disallow: `/api/`, `/studio/`, `/login/`, `/register/`, `/admin/`, `/_next/`, `/_redirects`, `*.pdf$`, `*.doc$`
- Allow: all public pages
- Explicit rules for Googlebot, Bingbot, GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot

### Sitemap
- Only includes 200 OK, indexable URLs
- No redirects in sitemap
- No noindex pages in sitemap

### Pages with `robots: "index, follow"` (default)
- `/` (homepage)
- `/villa-bruno`
- `/about`
- `/faq`
- `/reviews`
- `/tours`
- `/tours/*` (individual tours)
- `/contact`
- `/gallery`
- `/blog/*` (blog posts)
- `/en/...` equivalents (via hreflang)

### Pages with `robots: "noindex, nofollow"`
- `/api/*` (via robots.txt)
- `/studio/*` (via robots.txt)
- `/admin/*` (via robots.txt)
- Unpublished pages (dynamic check in generateMetadata)
- Preview/draft mode pages

---

## C. Canonical + Hreflang

### Layout-level meta.ts
- Self-referencing absolute canonical on every page
- `x-default` points to root `/` (English)
- Only declares hreflang for locales with actual content (currently only `en`)
- `og:locale` matches each language (en_US, es_CR, de_DE, nl_NL, ru_RU)

### Page-level generateMetadata
- Dynamic canonical per page
- Hreflang alternates built from Sanity `translations` field
- Only includes locales where translation actually exists
- `og:locale` per page

### Example: Villa Bruno Page
```html
<link rel="canonical" href="https://fincaguarumo.com/villa-bruno" />
<link rel="alternate" hreflang="x-default" href="https://fincaguarumo.com/villa-bruno" />
<link rel="alternate" hreflang="en" href="https://fincaguarumo.com/villa-bruno" />
<!-- Spanish added when translation exists -->
```

---

## D. Sitemap.xml

### src/lib/generateSiteMap.ts
- Generates from Sanity + routes
- Only indexable, 200, canonical URLs
- Accurate `lastmod` from Sanity `_updatedAt`
- Hreflang alternates only for existing translations
- No double-locale URLs (`/en/en/...`)
- No non-English locale URLs without translations

### Included URLs
- `/` (homepage, priority 1.0, daily)
- `/villa-bruno` (priority 0.9, weekly)
- `/about` (priority 0.9, monthly)
- `/faq` (priority 0.85, weekly)
- `/reviews` (priority 0.9, weekly)
- `/tours` (priority 0.85, weekly)
- `/tours/{slug}` (priority 0.8, weekly)
- `/contact` (priority 0.8, monthly)
- `/gallery` (priority 0.7, weekly)
- `/blog/{slug}` (priority 0.6, monthly)

### Referenced in robots.txt
```
Sitemap: https://fincaguarumo.com/sitemap.xml
```

---

## E. robots.txt

### src/app/robots.ts
```txt
User-agent: *
Allow: /
Disallow: /api/, /studio/, /login/, /register/, /admin/, /_next/, /_redirects, *.pdf$, *.doc$

User-agent: Googlebot
Allow: /
Disallow: /api/, /studio/, /admin/, /_next/

User-agent: Bingbot
Allow: /
Disallow: /api/, /studio/, /admin/, /_next/

User-agent: GPTBot
Allow: /
Disallow: /api/, /studio/, /admin/, /_next/

User-agent: OAI-SearchBot
Allow: /
Disallow: /api/, /studio/, /admin/, /_next/

User-agent: ClaudeBot
Allow: /
Disallow: /api/, /studio/, /admin/, /_next/

User-agent: PerplexityBot
Allow: /
Disallow: /api/, /studio/, /admin/, /_next/

Sitemap: https://fincaguarumo.com/sitemap.xml
```

---

## F. Metadata

### Removed
- `keywords` meta tag (all pages)

### Per-Page Unique
- Title: from Sanity `title` field + " - Finca Guarumo"
- Description: from Sanity `description` field with fallbacks
- OpenGraph: matches page content and language
- Twitter: matches page content and language
- `og:locale` per language

### Fallbacks
- Homepage: generic Osa Peninsula description
- Villa Bruno: eco-villa description
- Tours: wildlife/sustainable tourism description
- Blog: sustainable living description
- FAQ: common questions description

---

## G. Structured Data (JSON-LD)

### Homepage (`/`) - `@graph` with:
- ✅ `WebSite` (name, url, search action, publisher)
- ✅ `LodgingBusiness` / `VacationRental` (Villa Bruno full details)

### Villa Bruno (`/villa-bruno`) - `@type: LodgingBusiness` + `VacationRental`:
- ✅ Name, alternateName, description, url
- ✅ Address (PostalAddress with street, city, region, postalCode, country)
- ✅ Geo coordinates
- ✅ Telephone, email, priceRange, currenciesAccepted, paymentAccepted
- ✅ AmenityFeature (10+ features with boolean values)
- ✅ Check-in/out times, numberOfRooms, floorSize, occupancy
- ✅ AggregateRating (5/5, 11 reviews)
- ✅ Individual Reviews (3 reviews with author, date, rating, body)
- ✅ Images (8 images)
- ✅ MakesOffer (Offer with HotelRoom, price, availability)
- ✅ sameAs (Instagram, Facebook, YouTube)
- ✅ knowsAbout, areaServed, tourBookingPage

### Tour Pages (`/tours/{slug}`) - `@type: TouristTrip`:
- ✅ Name, description, url
- ✅ Provider (Organization)
- ✅ Offers (Offer with price, currency, availability)
- ✅ Duration (ISO 8601)
- ✅ Itinerary (from body content)
- ✅ Image
- ✅ inLanguage, isPartOf (TouristDestination)

### FAQ Page (`/faq`) - `@type: FAQPage`:
- ✅ dateModified
- ✅ mainEntity (Question + Answer pairs from Sanity)

### Blog Posts (`/blog/{slug}`) - `@type: BlogPosting`:
- ✅ headline, description, url
- ✅ datePublished, dateModified
- ✅ author (Organization: Finca Guarumo)
- ✅ publisher (Organization with logo)
- ✅ image (from mainImage)
- ✅ inLanguage: "en"
- ✅ isPartOf (Blog)

### All Pages - `@type: BreadcrumbList`:
- Added via `Breadcrumbs` component (already exists)

### Organization (Homepage + Villa Bruno) - `@type: Organization`:
- ✅ Name, alternateName, url, logo, description
- ✅ foundingDate, owns (LodgingBusiness), address, geo
- ✅ contactPoint (telephone, email, availableLanguage)
- ✅ sameAs (Instagram, Facebook, YouTube, Maps)

---

## H. Rendering/Performance

### Hero Images
- Video poster uses `priority` and `fetchPriority="high"`
- `sizes` attribute: `(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px`
- `placeholder="blur"` with `blurDataURL` for LCP optimization
- Critical video loads immediately, non-critical uses `requestIdleCallback`

### Primary Text
- All primary content server-rendered (RSC)
- Client components only for interactivity (booking, maps, video)

---

## I. llms.txt

### public/llms.txt
- Updated with key pages:
  - Homepage
  - Villa Bruno (Accommodation)
  - About Us
  - FAQ
  - Guest Reviews
  - Experiences/Tours
  - Contact
  - Location & Directions
- Updated last modified date: 2026-10-19

---

## J. CMS Tasks

See `CMS_TODO.md` for all content changes needed in Sanity Studio.

---

## URLs to Inspect in Search Console

### Priority 1 - Canonical URLs (must return 200, indexable, self-canonical)
```
https://fincaguarumo.com/
https://fincaguarumo.com/villa-bruno
https://fincaguarumo.com/about
https://fincaguarumo.com/faq
https://fincaguarumo.com/reviews
https://fincaguarumo.com/tours
https://fincaguarumo.com/contact
https://fincaguarumo.com/gallery
```

### Priority 2 - Tour Pages (verify each)
```
https://fincaguarumo.com/tours/{slug}  (for each published tour)
```

### Priority 3 - Blog Posts
```
https://fincaguarumo.com/blog/{slug}  (for each published post)
```

### Priority 4 - Verify Redirects (should be 308 single-hop)
```
https://fincaguarumo.com/en           → 308 → https://fincaguarumo.com/
https://fincaguarumo.com/en/          → 308 → https://fincaguarumo.com/
https://fincaguarumo.com/en/en/*      → 308 → https://fincaguarumo.com/en/*
https://fincaguarumo.com/es/blog      → 308 → https://fincaguarumo.com/en/blog
https://fincaguarumo.com/es/blog/*    → 308 → https://fincaguarumo.com/en/blog/*
https://fincaguarumo.com/ru/blog      → 308 → https://fincaguarumo.com/en/blog
https://fincaguarumo.com/de/blog      → 308 → https://fincaguarumo.com/en/blog
https://fincaguarumo.com/nl/blog      → 308 → https://fincaguarumo.com/en/blog
https://fincaguarumo.com/es/          → 308 → https://fincaguarumo.com/es
https://fincaguarumo.com/de/          → 308 → https://fincaguarumo.com/de
https://fincaguarumo.com/nl/          → 308 → https://fincaguarumo.com/nl
https://fincaguarumo.com/ru/          → 308 → https://fincaguarumo.com/ru
```

### Priority 5 - Sitemap & Robots
```
https://fincaguarumo.com/sitemap.xml
https://fincaguarumo.com/robots.txt
https://fincaguarumo.com/llms.txt
```

---

## Validation Checklist

- [ ] All sitemap URLs return 200
- [ ] No internal links point to redirecting URLs
- [ ] No noindex pages in sitemap
- [ ] JSON-LD validates on:
  - [ ] Homepage (WebSite + LodgingBusiness)
  - [ ] Villa Bruno (LodgingBusiness/VacationRental)
  - [ ] Tour page (TouristTrip)
  - [ ] FAQ page (FAQPage)
  - [ ] Blog post (BlogPosting)
- [ ] Rich Results Test passes for all above
- [ ] validator.schema.org passes for all JSON-LD
- [ ] Core Web Vitals: LCP < 2.5s, INP < 200ms, CLS < 0.1 (mobile)
- [ ] hreflang reciprocity verified
- [ ] x-default points to root `/`

---

## Files Modified

1. `next.config.mjs` - Redirects
2. `src/app/robots.ts` - Robots.txt with AI crawlers
3. `src/lib/generateSiteMap.ts` - Sitemap generation
4. `src/app/[locale]/meta.ts` - Layout-level metadata
5. `src/app/[locale]/(pages)/[slug]/page.tsx` - Dynamic page metadata + structured data
6. `src/app/[locale]/(pages)/villa-bruno/page.tsx` - Villa Bruno metadata + structured data
7. `src/app/[locale]/blog/[slug]/metadata.ts` - Blog post metadata
8. `src/app/[locale]/blog/[slug]/page.tsx` - Blog post structured data
9. `src/app/[locale]/(pages)/tours/[slug]/metadata.ts` - Tour metadata
10. `src/app/[locale]/(pages)/tours/[slug]/page.tsx` - Tour structured data
11. `src/app/[locale]/(pages)/faq/page.tsx` - FAQ metadata + structured data
12. `src/app/[locale]/page.tsx` - Homepage metadata + structured data
13. `src/components/Footer.tsx` - Locale-aware links
14. `public/llms.txt` - Updated key pages
15. `CMS_TODO.md` - Created (content tasks)
16. `CHANGES.md` - Created (this file)