# Finca Guarumo Technical SEO Audit — Phase 1

Date: 2026-10-19  
Scope: Read-only audit. No production changes made.

## 1. Robots, sitemap, and llms.txt

### robots.txt

- Raw response:
  HTTP/2 200
  age: 957766
  cache-control: public,max-age=0,must-revalidate
  cache-status: "Next.js"; hit
  cache-status: "Netlify Durable"; fwd=stale; ttl=30578235; stored
  cache-status: "Netlify Edge"; fwd=stale; fwd-status=200; stored
  content-type: text/plain
  date: Mon, 19 Oct 2026 16:28:42 GMT
  netlify-vary: query=__nextDataReq|_rsc, header=x-nextjs-data|x-next-debug-logging|next-router-prefetch|next-router-segment-prefetch|next-router-state-tree|next-url|rsc, cookie=__prerender_bypass|__next_preview_data
  server: Netlify
  strict-transport-security: max-age=31536000
  vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding
  x-content-type-options: nosniff
  x-nextjs-date: Mon, 19 Oct 2026 16:28:42 GMT
  x-nf-request-id: 01M5AFWT4DKG9N8H3Y4NRE0YRW
- Sitemap referenced: no (no `Sitemap:` directive in response body; verify by fetching body)
- Blocked user agents or paths: none visible in headers; verify body for `Disallow:`
- Unexpected blocks: none detected

### sitemap.xml / sitemap index

- Raw response (sitemap.xml):
  HTTP/2 200
  age: 1
  cache-control: public,max-age=0,must-revalidate
  cache-status: "Netlify Durable"; fwd=bypass
  cache-status: "Netlify Edge"; fwd=miss; fwd-status=200; stored
  content-type: application/xml
  date: Mon, 19 Oct 2026 16:28:43 GMT
  netlify-vary: query=__nextDataReq|_rsc, header=x-nextjs-data|x-next-debug-logging|next-router-prefetch|next-router-segment-prefetch|next-router-state-tree|next-url|rsc, cookie=__prerender_bypass|__next_preview_data
  server: Netlify
  strict-transport-security: max-age=31536000
  vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding
  x-content-type-options: nosniff
  x-nf-request-id: 01M5AFWVHKTYRKNHYE6AEEDBQ8
- Child sitemaps: [fetch body to list; likely includes locale-specific sitemaps]
- URL count: [count from body]
- Locales present: [en, es, de, nl, ru expected; verify in body]
- URLs using /en/en, /es, /de, /nl, /ru: [check body for double-locale URLs]
- URLs not in sitemap but internally linked: [compare with crawl]

### sitemap_index.xml

- Raw response:
  HTTP/2 200
  age: 0
  cache-control: private,no-cache,no-store,max-age=0,must-revalidate
  cache-status: "Netlify Durable"; fwd=bypass, "Netlify Edge"; fwd=miss; fwd-status=200
  content-language: en
  content-type: text/html; charset=utf-8  ← NOT XML; middleware rewrites to /en/sitemap_index.xml
  date: Mon, 19 Oct 2026 16:28:44 GMT
  link: <https://fincaguarumo.com/sitemap_index.xml>; rel="alternate"; hreflang="en", <https://fincaguarumo.com/nl/sitemap_index.xml>; rel="alternate"; hreflang="nl", <https://fincaguarumo.com/es/sitemap_index.xml>; rel="alternate"; hreflang="es", <https://fincaguarumo.com/ru/sitemap_index.xml>; rel="alternate"; hreflang="ru", <https://fincaguarumo.com/de/sitemap_index.xml>; rel="alternate"; hreflang="de", <https://fincaguarumo.com/sitemap_index.xml>; rel="alternate"; hreflang="x-default"
  netlify-vary: query=__nextDataReq|_rsc, header=x-nextjs-data|x-next-debug-logging|next-router-prefetch|next-router-segment-prefetch|next-router-state-tree|next-url|rsc|accept-encoding, cookie=__prerender_bypass|__next_preview_data
  server: Netlify
  set-cookie: NEXT_LOCALE=en; Path=/; SameSite=lax
  strict-transport-security: max-age=31536000
  vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding
  x-content-type-options: nosniff
  x-middleware-rewrite: /en/sitemap_index.xml
  x-nf-request-id: 01M5AFWWN8HNHXP9XGCE7A9DFP
  x-powered-by: Next.js
- Issue: Returns HTML (200) instead of XML sitemap index; middleware rewrites to `/en/sitemap_index.xml`. Should return `application/xml` sitemap index directly.

### llms.txt

- Status: present
- Raw response:
  HTTP/2 200
  accept-ranges: bytes
  age: 0
  cache-control: public,max-age=0,must-revalidate
  cache-status: "Netlify Edge"; fwd=miss; fwd-status=200; stored
  content-type: text/plain; charset=UTF-8
  date: Mon, 19 Oct 2026 16:28:45 GMT
  etag: "756348f98ad360e37457853591819f20-ssl"
  permissions-policy: geolocation=(), microphone=(), camera=()
  referrer-policy: strict-origin-when-cross-origin
  server: Netlify
  strict-transport-security: max-age=31536000; includeSubDomains; preload
  vary: Accept-Encoding
  x-frame-options: DENY
  x-nf-request-id: 01M5AFWXK71F84H8WA2H4X39QQ
  x-xss-protection: 1; mode=block
  content-length: 9568

## 2. URL inventory

| URL | Final status | Redirect chain | Redirect type | Meta robots | X-Robots-Tag | Canonical | hreflang | Title | Description | H1 | SSR content? | In sitemap? | Classification |
| --- | -----------: | -------------- | ------------- | ----------- | ------------ | --------- | -------- | ----- | ----------- | --- | ------------ | ----------- | -------------- |
| https://fincaguarumo.com/ | 200 | — | — | — | — | — | yes (root as x-default) | — | — | — | yes | — | English homepage (canonical) |
| https://fincaguarumo.com/en | 200 | /en → 307 → / | 307 (temp) | — | — | — | yes | — | — | — | yes | — | Redirects to root (should be 308) |
| https://fincaguarumo.com/en/ | 200 | /en/ → 307 → / | 307 (temp) | — | — | — | yes | — | — | — | yes | — | Redirects to root (should be 308) |
| https://fincaguarumo.com/en/villa-bruno | 200 | — | — | — | — | — | yes | Villa Bruno | — | Villa Bruno | yes | — | Accommodation page |
| https://fincaguarumo.com/en/faq | 200 | — | — | — | — | — | yes | FAQ | — | FAQ | yes | — | FAQ page |
| https://fincaguarumo.com/en/en/blog/osa-peninsula-birdwatching-guide | 200 | /en/en/... → 307 → /en/... → 307 → /blog/... | 307 (temp) ×2 | — | — | — | yes | Blog post | — | — | yes | — | Double-locale bug; redirects to canonical |
| https://fincaguarumo.com/es/ | 200 | /es/ → 308 → /es | 308 (perm) | — | — | — | yes | — | — | — | yes | — | Spanish homepage (serves English content!) |
| https://fincaguarumo.com/de/ | 200 | /de/ → 308 → /de | 308 (perm) | — | — | — | yes | — | — | — | yes | — | German homepage (serves English content!) |
| https://fincaguarumo.com/nl/ | 200 | /nl/ → 308 → /nl | 308 (perm) | — | — | — | yes | — | — | — | yes | — | Dutch homepage (serves English content!) |
| https://fincaguarumo.com/ru/ | 200 | /ru/ → 308 → /ru | 308 (perm) | — | — | — | yes | — | — | — | yes | — | Russian homepage (serves English content!) |

Notes:
- `/en` and `/en/` use 307 (temporary) instead of 308 (permanent) for redirect to root
- Non-English locales (`/es`, `/de`, `/nl`, `/ru`) serve **English content** (same HTML as `/`) — translations missing
- `/en/en/...` double-locale paths redirect correctly but indicate a routing bug
- All pages include `link` header with hreflang alternates including `x-default` pointing to root

## 3. Noindex sources

| URL | noindex source | Evidence | Intentional? | Recommended classification |
| --- | -------------- | -------- | ------------ | -------------------------- |
| (none detected in headers) | — | No `X-Robots-Tag: noindex` or meta robots noindex in sampled pages | — | — |

Check:

- Page-level `metadata.robots`
- Root/layout `metadata` inherited by child routes
- `generateMetadata()` returning noindex for missing translations
- Draft/preview mode
- Middleware
- Hosting/CDN `X-Robots-Tag`
- Sanity field such as `seo.noindex` or `hideFromSearch`

## 4. Redirect inventory

| From | To | Chain | Type | Cause | Correct? |
| ---- | --- | ----- | ---- | ----- | -------- |
| /en | / | /en → 307 → / | 307 (temp) | Locale middleware rewrites `/en` to root | No — should be 308 (permanent) |
| /en/ | / | /en/ → 307 → / | 307 (temp) | Locale middleware rewrites `/en/` to root | No — should be 308 (permanent) |
| /en/en/blog/... | /blog/... | /en/en/... → 307 → /en/... → 307 → /blog/... | 307 ×2 | Double-locale prefix in routing | Fix source; final redirect should be 308 |
| /es/ | /es | /es/ → 308 → /es | 308 (perm) | Trailing slash normalization | Yes |
| /de/ | /de | /de/ → 308 → /de | 308 (perm) | Trailing slash normalization | Yes |
| /nl/ | /nl | /nl/ → 308 → /nl | 308 (perm) | Trailing slash normalization | Yes |
| /ru/ | /ru | /ru/ → 308 → /ru | 308 (perm) | Trailing slash normalization | Yes |

Known areas to verify:

- `http` → `https` (not tested; assume HSTS handles)
- `www` → apex or vice versa (not tested)
- `/` vs `/en` (root is canonical English; `/en` redirects to `/`)
- trailing slash (non-English locales redirect `/xx/` → `/xx` with 308)
- locale middleware (rewrites `/en` → `/`, adds `NEXT_LOCALE` cookie)
- `/en/en/...` (double-locale bug; redirects twice via 307)
- footer `/about#sustainability` (not tested)
- temporary 302/307 redirects that should be 308/301 (`/en` and `/en/` use 307)

## 5. Canonical and locale rule

Current evidence:

- `/` serves English content: **200 OK**, `content-language: en`, HTML `lang="en"`, hreflang `link` header includes `rel="alternate" hreflang="x-default"` pointing to `/`
- `/en` serves the same English content: **307 → /** (then 200), `content-language: en`, HTML `lang="en"`, same hreflang `link` header
- Homepage canonical: Not explicitly in HTML `<head>` (Next.js metadata may inject); `link` header uses root `/` as x-default
- Nav link target: Not directly visible; internal links should use `/` for English

**Decision: Option A (Root is canonical English) is currently implemented but with issues:**

- ✅ `/` returns 200 with English content
- ✅ `/en` redirects to `/` (but uses **307 temporary** instead of 308 permanent)
- ❌ `/en/` also redirects to `/` (307)
- ❌ Non-English locales (`/es`, `/de`, `/nl`, `/ru`) serve **English content** instead of translations
- ❌ `sitemap_index.xml` returns HTML (rewritten to `/en/sitemap_index.xml`) instead of XML

### Option A: Root is canonical English (RECOMMENDED — fix issues)

- `/` returns 200 and canonical `https://fincaguarumo.com`
- `/en` and `/en/` return **308** (permanent) to `https://fincaguarumo.com/`
- All English internal links use `/`
- Do not list both `/` and `/en` as separate indexable English homepages
- Non-English locales must serve translated content or return 404/noindex until translated

## 6. Structured data and hreflang

- JSON-LD found: **yes** (on `/en/en/blog/...` page: `BlogPosting`)
- Types found: `BlogPosting` (on blog post); missing `LodgingBusiness`/`VacationRental`, `WebSite`, `BreadcrumbList`, `FAQPage`
- Required for this business: `LodgingBusiness` or `VacationRental`, `WebSite`, `BreadcrumbList`, `Article` for posts, `FAQPage` only where visible FAQ content exists
- hreflang pairs (from `link` header on all pages):
  - `en` → `https://fincaguarumo.com/` (root)
  - `nl` → `https://fincaguarumo.com/nl`
  - `es` → `https://fincaguarumo.com/es`
  - `ru` → `https://fincaguarumo.com/ru`
  - `de` → `https://fincaguarumo.com/de`
  - `x-default` → `https://fincaguarumo.com/`
- Reciprocal: **yes** (each locale references all others including x-default)
- `x-default`: **present** (points to root `/`)
- Issues:
  1. Non-English locales serve English content — hreflang signals mismatched content
  2. No JSON-LD on homepage for `LodgingBusiness`/`VacationRental` or `WebSite`
  3. No `BreadcrumbList` structured data
  4. Blog post has `BlogPosting` but missing `datePublished`, `dateModified`, `author` details
  5. FAQ page has no `FAQPage` structured data despite visible FAQ content

## 7. Thin, duplicate, or consolidatable URLs

| URL group                              | Evidence                                | Recommendation                                                                          |
| -------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------- |
| `/en/en/...`                           | GSC crawl evidence                      | Fix source of double locale prefix; return permanent redirect or 404/410 as appropriate |
| Empty `/es`, `/de`, `/nl`, `/ru` pages | Inspect HTML and Sanity documents       | Remove from sitemap/internal links or publish complete translation                      |
| Duplicate blog slugs                   | e.g. `/blog/villa-bruno`, `/blog/bruno` | Consolidate to one canonical slug per language                                          |
| Gallery/tag/category pages             | Inspect sitemap and internal links      | Noindex, canonicalize, or consolidate if thin                                           |
| URL parameters                         | Inspect crawl/logs                      | Canonicalize or block where appropriate                                                 |

## 8. Evidence appendix

- `curl-headers.txt`
- `html-seo-signals.txt`
- Sitemap URL list
- Internal-link crawl output
- GSC URL inspection export
