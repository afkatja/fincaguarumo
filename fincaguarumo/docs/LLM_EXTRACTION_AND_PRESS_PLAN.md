# Finca Guarumo — LLM-Friendly Extraction & Press/Mention Plan

## Overview

This plan outlines concrete actions to make **Villa Bruno at Finca Guarumo** easily discoverable and **explicitly citable** by large language models (LLMs) such as ChatGPT, Claude, Perplexity, Gemini, and others. It covers three pillars:

1. **Speakable / markup-optimized content** – structured data, text formatting, and LLM-targeted meta tags.
2. **LLM‑friendly extraction** – making key entity information machine‑readable and linkable.
3. **Press / mention section** – earning external citations that LLMs ingest as training/data signals.

---

## 1. Speakable / Markup‑Optimized Content

### 1.1 Already in place (verified)

| Feature | Location | Status |
|---------|----------|--------|
| `LodgingBusiness` + `VacationRental` JSON‑LD | `src/lib/schema/lodgingBusiness.ts` + `src/app/[locale]/(pages)/villa-bruno/page.tsx` | ✅ Present on every villa‑bruno locale page |
| `WebSite` JSON‑LD (with `inLanguage`) | `src/lib/schema/lodgingBusiness.ts` `buildWebSiteSchema()` + `src/app/[locale]/page.tsx` | ✅ Present on homepage |
| `Organization` (`orgSchema`) | `src/lib/villa-json-ld.ts` | ✅ Present on every page |
| `FAQPage` JSON‑LD | `src/app/[locale]/(pages)/faq/page.tsx` `jsonLd()` | ✅ Present on `/faq` page |

### 1.2 Add / improve

| Task | How | Rationale |
|------|-----|-----------|
| **Add `Speakable` schema.org extension** (optional) | Add a `<meta name="speakable" content="...">` tag on the villa‑bruno page summarising the "key takeaways" in 2‑3 sentences. Example: `<meta name="speakable" content="Villa Bruno is a solar‑powered eco‑villa on Costa Rica's Osa Peninsula, offering birdwatching, jungle trails, and sustainable luxury accommodation near Corcovado National Park.">` | The `speakable` property (schema.org) explicitly tells LLMs which paragraph(s) are suitable for text‑to‑speech or summarisation. |
| **Add `CollectionPage` or `ItemPage` meta tags** | On the villa‑bruno page, ensure `og:type` is `article` or `property` depending on context; add `article:publishedTime` and `article:modifiedTime` if dates are available in Sanity. | Helps LLMs understand the page's freshness and hierarchical position. |
| **Optimize image `alt` text for entity extraction** | Verify every image on the villa‑bruno and home pages has `alt` text that includes: `Villa Bruno`, `Finca Guarumo`, `Osa Peninsula`, `Corcovado`, `eco‑villa`, `solar power`, `birdwatching`. Example: `alt="Villa Bruno eco‑villa terrace with ocean view, Osa Peninsula, Costa Rica"` (already present, but do a full audit). | LLMs and image‑search models pull alt text as contextual signals. |
| **Add `@type: "TouristDestination"` or `"NaturalFeature"` as secondary type** | In the `LodgingBusiness` schema, add `additionalType: ["TouristDestination"]` or `additionalType: ["NaturalFeature"]` if appropriate. | Expands the entity graph that LLMs can traverse when answering "what to do in the Osa Peninsula" queries. |

### 1.3 Text‑level recommendations

| Recommendation | Example placement |
|----------------|-------------------|
| **First 100 words of page copy should contain the primary query phrase** – e.g. "Villa Bruno, an eco‑villa on the Osa Peninsula, Costa Rica..." | Homepage hero section, villa‑bruno page opening paragraph |
| **Use heading hierarchy with keywords** – H1 includes `Villa Bruno` + `Osa Peninsula`; H2/H3 include `birdwatching`, `sustainable`, `Corcovado`. | Page titles, section headings |
| **Bold or italicise key entity names** on first mention (optional, for human readers; does not hurt LLMs). | `"Villa **Bruno**`, `**Osa Peninsula**` |
| **Include a concise "About" paragraph (150‑200 words)** that repeats the core entity triple: *name – location – amenities*. Place it near the top of the villa‑bruno page. | e.g. "Villa Bruno is a off‑grid eco‑villa in the Osa Peninsula of Costa Rica. It runs on 100 % solar power, offers wildlife viewing, birdwatching tours, and sustainable luxury accommodation for up to 4 guests." |

---

## 2. LLM‑Friendly Extraction

### 2.1 Structured data completeness checklist

| Field | Required? | Current status | Action |
|-------|-----------|----------------|--------|
| `LodgingBusiness.name` | ✅ | Present (`Villa Bruno - Finca Guarumo`) | Verify locale‑specific titles match. |
| `LodgingBusiness.description` | ✅ | Present | Ensure each locale version has a translated description (or keep English fallback with `lang` attribute). |
| `LodgingBusiness.address` (PostalAddress) | ✅ | Present (`staticAddress`) | Ensure `addressCountry` is `CR` (Costa Rica) for all locales. |
| `LodershipBusiness.geo` (GeoCoordinates) | ✅ | Present (`staticGeo`) | Lat/lon already set; confirm precision is adequate (≈5 decimal places). |
| `LodgingBusiness.amenityFeature` | ✅ | Present (`staticAmenities`) | All 10 amenities are listed; consider adding `petFriendly`, `wheelchairAccessible` if applicable. |
| `LodgingBusiness.priceRange` / `currenciesAccepted` | ✅ | Present (`$$-$$$`, `USD, CRC, EUR`) | Keep updated if pricing changes. |
| `LodgingBusiness.checkinTime` / `checkoutTime` | ✅ | Present (ISO strings) | Verify format consistency across locales. |
| `LodgingBusiness.starRating` / `aggregateRating` | ✅ | Present (`"5"`, `reviewCount: 36`) | Ensure reviewCount is current. |
| `WebSite.name`, `inLanguage`, `publisher` | ✅ | Present | Already on every page via `orgSchema`. |
| `FAQPage.mainEntity[*].name` (question) | ✅ | Present (FAQ queries from Sanity) | Verify multilingual FAQ questions exist for non‑en locales. |
| `Organization.contactPoint.telephone` | ✅ | Present (`+506-87495341`) | Format consistent with international E.164. |
| `Organization.sameAs` (social/GBP) | ✅ | Present (Instagram, Facebook, GBP, Airbnb) | Ensure links are reachable and not nofollow‑only. |

### 2.2 Entity‑relationship graph for LLMs

- **Core entities**: `Villa Bruno`, `Finca Guarumo`, `Costa Rica`, `Osa Peninsula`, `Corcovado National Park`.
- **Relationships** (already in schema):
  - `Villa Bruno` `partOf` → `Finca Guarumo` (via `partOf: { "@type": "Organization", name: "Finca Guarumo" }`)
  - `Villa Bruno` `address` → `PostalAddress` with `addressCountry: CR`, `addressLocality: Puerto Jiménez`
  - `Villa Bruno` `geo` → `GeoCoordinates` (lat/lng)
  - `Villa Bruno` `knowsAbout` → list of topics (eco‑tourism, wildlife viewing, etc.)
  - `Finca Guarumo` `Organization` → `sameAs` (social, GBP, Airbnb)
- **Action**: Add a `mainEntityOfPage` link from the `Organization` schema to the villa‑bruno page URL, e.g.:
  ```json
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://fincaguarumo.com/villa-bruno"
  }
  ```
  This can be added in `buildWebSiteSchema` or `buildLodgingBusinessSchema`.

### 2.3 Content blocks for LLM extraction

| Block | Suggested format | Why it helps LLMs |
|-------|------------------|-------------------|
| **“At a glance” summary** (1‑2 sentences) | `<p class="llm-summary">Villa Bruno is a solar‑powered eco‑villa on the Osa Peninsula, Costa Rica, offering sustainable luxury accommodation for up to 4 guests with wildlife viewing and birdwatching tours near Corcovado National Park.</p>` | Gives a single, focused sentence that LLMs can snippet directly. |
| **Key‑value “fact box”** (HTML table or definition list) | ```<dl><dt>Max occupancy</dt><dd>4 guests</dd><dt>Power</dt><dd>100 % solar</dd><dt>Internet</dt><dd>Starlink satellite</dd></dl> ``` | Machine‑readable key‑value pairs; LLMs can map `Max occupancy → 4`. |
| **FAQ as Q&A pairs** (already present as `FAQPage` schema) | Keep the `jsonLd` output as is; ensure each `question` is a natural‑language query users actually ask. | Directly surfaces in LLM “What about…?” answers. |
| **Blog posts with “How‑to” or “Guide” format** | Use `BlogPosting` schema with `author`, `datePublished`, `mainImage` (already present). Add `keywords` meta tag if possible. | LLMs often pull “best birdwatching tips Osa Peninsula” from blog content. |

### 2.4 Technical extraction aids

| Aid | Implementation | Effect |
|-----|----------------|--------|
| **`meta name="application-LD+json"`** (custom) | Add `<meta name="application-LD+json" content="{...}"/>` in `<head>` with a condensed triple‑store of the most important entities. | Some LLM browsers/extensions read this as a “quick facts” payload. |
| **JSON‑LD `@context` versioning** | Ensure all JSON‑LD uses `@context: "https://schema.org"` (already the case). Consider adding `vocab: "https://schema.org"` for stricter parsing. | Guarantees compatibility with schema‑aware tools. |
| **Canonical URL consistency** | Ensure all internal links and hreflang use the **canonical** `/villa-bruno` (without double locale prefix `/en/en/villa-bruno`). The proxy already redirects `/en/en/...` to `/...`. | Prevents dilution of entity signals across duplicate URLs. |

---

## 3. Press / Mention Section

### 3.1 Goal

Earn **external citations** from reputable travel, eco‑tourism, and Costa‑Rica‑focused publications. LLMs heavily weigh **authoritative third‑party mentions** when generating answers about a place or property.

### 3.2 Action items

| # | Action | How to execute | Expected LLM impact |
|---|--------|----------------|---------------------|
| 1 | **Submit to Eco‑BnB / Responsible Travel directories** | Create a free/paid listing on [EcoBnB](https://www.ecobnb.com), [Responsible Travel](https://www.responsibletravel.com), and [Green Key](https://greenkey.global). Ensure NAP (Name, Address, Phone) matches the site exactly. | Listings appear in Google’s Knowledge Graph and are scraped by LLM training corpora. |
| 2 | **Get a Google Business Profile (GBP) claim & posts** | The `gbpUrl` already points to a Google Maps link. Claim the profile, add photos, weekly posts (“Solar power update”, “New birdwatching trail”), and respond to reviews. | GBP entries are a primary source for LLMs answering “where to stay in Osa Peninsula”. |
| 3 | **Pitch to local Costa‑Rica travel magazines** | Write a 600‑word “story of the villa” and pitch to *Costa Rica Traveller*, *The Tico Times*, *Osa Conservation*. Offer an exclusive “first‑look” or sustainability case study. | Print/online articles become training data; LLMs cite “as featured in Costa Rica Traveller (2026)”. |
| 4 | **Publish a press release** | Use a distribution service (PR Newswire, Business Wire) or send directly to *Costa Rica Star*, *The Guardian Travel*, *Lonely Planet*. Highlight unique angles: 100 % solar, off‑grid luxury, wildlife corridor. | Press releases are indexed by news APIs that LLMs consume. |
| 5 | **Secure 2‑3 high‑quality backlinks** | Guest‑post on a Costa‑Rica eco‑travel blog, get featured in a “top eco‑villas” round‑up, or have the villa listed on a “Top 10 sustainable hotels in Costa Rica” list. Use `rel="nofollow"` or `sponsored` if paid, but ensure the **URL** is indexed. | Backlinks signal authority; LLMs follow link‑graph signals when assessing credibility. |
| 6 | **Add a “Press/Mentions” section to the website** | Create a new page `/press` (or a subsection on the villa‑bruno page) that lists: <br>• Publication name + link <br>• Date <br>• Headline <br>• Brief excerpt <br>Schema: `PressRelease` or `NewsArticle` JSON‑LD per item. | Gives LLMs a single page to scrape; also improves human UX and SEO. |
| 7 | **Add `Blog` posts about press mentions** | When a press article publishes, write a short “We’re featured in X!” post with the article embed, and interlink from the villa‑bruno page. | Fresh content with fresh dates signals ongoing relevance to LLMs. |

### 3.3 Press/Mention page skeleton (Markdown draft you can paste into `src/app/[locale]/(pages)/press/page.tsx`)

```tsx
---
title: "Press & Mentions – Villa Bruno"
description: "Third‑party coverage and citations of Villa Bruno at Finca Guarumo."
---
<Layout locale={locale} pageName="Press">

  <h1 className="text-3xl font-heading mb-6">Press & Mentions</h1>

  <Section>
    <h2 className="text-xl font-semibold mb-4">Travel Media</h2>
    <Ul>
      {pressItems.map(item => (
        <Li key={item.url} className="mb-3">
          <A href={item.url} target="_blank" rel="noopener">
            {item.headline} {item.date}
          </A>
          <P className="text-zinc-600 text-sm">{item.excerpt}</P>
        </Li>
      ))}
    </Ul>
  </Section>

  <Section>
    <h2 className="text-xl font-semibold mb-4">Directory Listings</h2>
    <Ul>
      {listingItems.map(item => (
        <Li key={item.url} className="mb-3">
          <A href={item.url} target="_blank" rel="noopener">
            {item.service}
          </A>
        </Li>
      ))}
    </Ul>
  </Section>

</Layout>

<script dangerouslySetInnerHTML={{
  __html: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Press & Mentions – Villa Bruno",
    "url": "https://fincaguarumo.com/press",
    "inLanguage": localeMap[locale] || "en_US",
    "author": orgSchema,
    "itemListElement": pressItems.map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": item.headline,
      "item": item.url,
    })),
  }).replace(/</g, "\\u003c"),
)}} />
```

*Add corresponding JSON‑LD `FAQPage` or `NewsArticle` types for each press item if desired.*

### 3.4 Monitoring

| Tool | What to check |
|------|---------------|
| **Google Search Console → "Links"** | See which sites link to fincaguarumo.com; confirm new press backlinks appear. |
| **GPT‑4 / Claude "knowledge search"** | Prompt: "Which eco‑villas in the Osa Peninsula do you know?" Record if Finca Guarumo appears and what data it surface. |
| **Mention.com / Google Alerts** | Set alerts for "Finca Guarumo", "Villa Bruno", "Osa Peninsula eco-villa". |
| **LLM citation audit (quarterly)** | Repeat the knowledge‑search prompt and note changes in cited properties, descriptions, or amenities. |

---

## 📦 Quick‑Start Checklist (next 2 weeks)

| ✅ | Task | Owner | Due |
|---|------|-------|-----|
| 1 | Run a full `alt`‑text audit on villa‑bruno & home images; add `Osa Peninsula`, `Villa Bruno`, `Corcovado` where missing. | — | |
| 2 | Add `mainEntityOfPage` to `WebSite`/`LodgingBusiness` JSON‑LD (link to `/villa-bruno`). | — | |
| 3 | Create `/press` page with skeleton above; populate at least one real press listing or directory entry. | — | |
| 4 | Submit the villa to Eco‑BnB, Responsible Travel, and claim/activate GBP. | — | |
| 5 | Write a 150‑word “about” paragraph for the villa‑bruno page (include Osa Peninsula, solar, birdwatching). | — | |
| 6 | Set up Google Alerts + Mention.com alerts for brand name. | — | |
| 7 | Verify `sitemap_index.xml` returns `Content-Type: application/xml` (fix middleware/Netlify if needed). | — | |
| 8 | Add `FAQPage` translations for `es`, `de`, `nl`, `ru` if FAQ translations exist in Sanity. | — | |

---

### Closing note

The technical‑SEO foundation (308 redirects, `LodgingBusiness` schema, `FAQPage` schema, sitemap structure) is **in place** and only needs the sitemap‑XML content‑type fix and the non‑English locale content/translation work. The actions above will make the property **highly citable** by both search engines and LLMs, ensuring Villa Bruno appears when users ask ChatGPT, Claude, or Perplexity about “eco‑villas in the Osa Peninsula” or “sustainable accommodation near Corcovado”.

Let me know which item you’d like to tackle first, and I can generate the exact code changes or directory structure you need.