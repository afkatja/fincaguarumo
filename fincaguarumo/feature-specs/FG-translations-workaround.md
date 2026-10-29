# Feature Spec: Translations Workaround

**Linear Key:** (to be added when linked to Linear)  
**Branch:** `feat/FG-translations-workaround`  
**Status:** Draft  
**Created:** 2026-10-29  

---

## 1. Overview

This implementation addresses the translations workflow for fincaguarumo's multilingual content, covering three key areas:

1. **Double Language Dropdown Bug Fix** - Eliminates the redundant template picker step when selecting a language
2. **Translatable Fields Configuration** - Per-schema classification of which fields to translate, copy as-is, or skip
3. **Bulk Translation CLI Script** - Standalone script to translate all English documents to all target languages

### Problem Addressed

- **Double language selector**: When creating a new document, users saw two selectors: first the language list, then inside that the template picker (which referenced non-existent template definitions)
- **No bulk translation**: Only per-document translation was available via the studio tool
- **No field-level classification**: No clear guidance on which fields should be translated vs copied as-is vs skipped

### Solution

- Fix the language dropdown to use `initialValue` instead of `initialValueTemplates`
- Add `TRANSLATABLE_FIELDS` and `COPY_AS_IS_FIELDS` configs per schema type
- Provide a bulk CLI script that translates all English docs to all target languages

---

## 2. Changes Made

### Part 1: Fix Double Language Dropdown Bug ✅

**File**: `src/sanity/structure/index.ts`

Changed `getLanguageItems` function to use `.initialValue({ language: lang.id })` instead of `.initialValueTemplates([S.initialValueTemplateItem(`${schemaType}-${lang.id}`)])`.

**Before**: Each language list item had both a language selector AND a template picker step (template IDs like `page-en` were referenced but never defined).

**After**: The language dropdown is the only selector; clicking a language pre-sets the `language` field and opens the doc form directly.

### Part 2: Expanded Translatable Fields Config ✅

**File**: `src/app/api/translate/route.ts`

Added translatable fields for 4 new schema types to the `TRANSLATABLE_FIELDS` config:

| Schema Type | Translatable Fields |
|-------------|--------------------|
| `activityBlock` | `["children"]` |
| `whyChooseVillaBruno` | `["title", "CTA_button"]` |
| `locationPage` | `["title", "subtitle", "description", "body"]` |
| `accommodation` | `["title", "subtitle", "description", "summary", "body", "highlightFeatures"]` |

Also added `COPY_AS_IS_FIELDS` for each schema type, defining which fields should be duplicated as-is across languages (not translated).

**New file**: `src/config/translatable-fields.js`
- Centralized `TRANSLATABLE_FIELDS` and `COPY_AS_IS_FIELDS` records
- Script now imports from this config instead of having definitions inline

### Part 3: Bulk Translation CLI Script ✅

**New file**: `scripts/translate-sanity-ai.ts`

Standalone script that:

1. **Fetches** all English documents for 9 translatable types: `page`, `post`, `tour`, `home`, `faq`, `activityBlock`, `whyChooseVillaBruno`, `locationPage`, `accommodation`

2. **For each target language** (nl, ru, es, de):
   - Clones the English doc, sets `language` field
   - Copies non-translatable fields as-is (defined in `COPY_AS_IS_FIELDS`)
   - Translates translatable text fields (defined in `TRANSLATABLE_FIELDS`)
   - Handles Portable Text (`blockContent`), string fields, and array fields like `highlightFeatures`
   - Creates/updates `translation.metadata` links

3. **Uses configurable translation providers** (google/ollama/libretranslate/huggingface) via `TRANSLATION_PROVIDER` env var

**Added npm script**: `package.json`
- `"translate:sanity-ai": "tsx --tsconfig tsconfig.scripts.json scripts/translate-sanity-ai.ts"`

**Usage**:
```bash
# Run the bulk translation script
npm run translate:sanity-ai

# Or with a specific provider
TRANSLATION_PROVIDER=google npm run translate:sanity-ai
```

### Config File: `src/config/translatable-fields.js`

New centralized config with:

```js
export const TRANSLATABLE_FIELDS = {
  faq: ["question", "answer"],
  page: ["title", "subtitle", "description", "body"],
  post: ["title", "body"],
  tour: ["title", "description", "body"],
  home: [...],
  activityBlock: ["children"],
  whyChooseVillaBruno: ["title", "CTA_button"],
  locationPage: ["title", "subtitle", "description", "body"],
  accommodation: ["title", "subtitle", "description", "summary", "body", "highlightFeatures"],
}

export const COPY_AS_IS_FIELDS = {
  faq: ["category", "keywords", ...],
  page: ["slug", "mainImage", ...],
  post: ["slug", "author", ...],
  tour: ["slug", "mainImage", ...],
  home: [...],
  activityBlock: [],
  whyChooseVillaBruno: [],
  locationPage: ["slug", "mainImage", ...],
  accommodation: [...],
}
```

---

## 3. How to Use

### Running the Bulk Translation

```bash
# Run with default provider (google)
npm run translate:sanity-ai

# Run with ollama (if running locally)
TRANSLATION_PROVIDER=ollama npm run translate:sanity-ai

# Run with libretranslate (hosted)
LIBRETRANSLATE_URL=https://libretranslate.com npm run translate:sanity-ai
```

### What the Script Does

1. Connects to Sanity using write token
2. Fetches all English documents for each translatable type
3. For each target language (nl, ru, es, de):
   - Checks if translation already exists
   - Copies non-translatable fields as-is
   - Translates translatable text fields
   - Creates new translation doc or updates existing
   - Updates `translation.metadata` links
4. Reports progress and completion

### Output

```
🌍 Starting bulk translation...
Target languages: [ 'nl (Nederlands)', 'ru (Русский)', 'es (Español)', 'de (Deutsch)' ]

📄 Processing type: page
  Found 0 English documents
  ⚠️  No English documents found for type: page

📄 Processing type: home
  Found 3 English documents
  🔄 Translating to nl (Nederlands)...
    ✅ Translated title
    ✅ Translated subtitle
    ...
  ✅ Complete: nl - 3 documents processed

🎉 Bulk translation complete!
```

---

## 4. Adding a New Document Type

When adding a new schema type to the translations system, follow these steps:

### 1. Add to `TRANSLATABLE_FIELDS` in `src/config/translatable-fields.js`

```js
// Add the new schema type with its translatable fields
myType: ["field1", "field2", "field3"],
```

### 2. Add to `COPY_AS_IS_FIELDS` in `src/config/translatable-fields.js`

```js
// Add the non-translatable fields for the new schema type
myType: ["slug", "mainImage", "someFieldToCopy"],
```

### 3. Add to the translatable types list in `scripts/translate-sanity-ai.ts`

```js
// Add to the translatableTypes array
"myType",
```

### 4. (Optional) Add API route support

If the new type should also be translatable via the `/api/translate` endpoint, add its fields to `TRANSLATABLE_FIELDS` there as well:

```js
// In src/app/api/translate/route.ts
const TRANSLATABLE_FIELDS = {
  // ... existing types
  myType: ["field1", "field2"],
}
```

### 5. Re-run the script

```bash
npm run translate:sanity-ai
```

The script will now include the new type in its processing.

---

## 5. Field Classification Guidelines

### Copy As-Is (shared across languages)

- `slug` - URL slug (must match across languages for proper routing)
- `mainImage` - Primary hero image (typically unchanged)
- `background_media` / `slideshow` - Media galleries
- `categories` - Taxonomy classifications
- `author` - Author reference (typically same person)
- `isPublished` - Publication status
- `geo` / `coordinates` - Location data
- `currency` - Price currency
- `booking` / `review` / `guestName` / `email` / `phone` / `reviewText` - Transactional/PII data (skip/skip)

### Translate (text content)

- `title` - Document title
- `subtitle` - Secondary title/description
- `description` - Full description text
- `body` / `intro_body` / `hero_title` / `hero_slogan` / `hero_body` / `tldr` - Main content
- `hero_title`, `hero_slogan`, `hero_body` - Hero section
- `openGraph.title` / `openGraph.description` - Social media sharing
- `highlightFeatures` / `features` - Feature arrays
- `faq` / `question` / `answer` - FAQ content
- `keywords` - SEO keywords

### Skip (do not clone/translate)

- `booking` - Booking transactions
- `review` - Customer reviews
- `guestName` / `email` / `phone` - PII data
- `reviewText` - Review content
- `author.name` - Author name (if user-specific)

---

## 6. Translation Provider Configuration

### Default: Google Translate

```bash
npm run translate:sanity-ai
```

Uses `TRANSLATION_PROVIDER` env var (default: "google"):

| Provider | Env var | Setup |
|----------|---------|-------|
| Google | `TRANSLATION_PROVIDER=google` | No setup needed (uses existing API) |
| Ollama | `TRANSLATION_PROVIDER=ollama` | Run Ollama locally: `ollama serve` |
| LibreTranslate | `TRANSLATION_PROVIDER=libretranslate` | Set `LIBRETRANSLATE_URL` |
| HuggingFace | `TRANSLATION_PROVIDER=huggingface` | Set `HUGGINGFACE_TOKEN` |

### Provider Comparison

| Provider | Cost | Quality | Setup |
|----------|------|---------|-------|
| Google | Paid API | Excellent | None (existing) |
| Ollama | Free (local) | Good | Local Ollama instance |
| LibreTranslate | Free (hosted) | Good | URL only |
| HuggingFace | Free (API) | Variable | Token required |

---

## 7. Idempotency & Re-running

The script is idempotent - running it multiple times:

- **Skips** documents where translation already exists and is complete
- **Updates** existing translations if fields have changed
- **Updates** `translation.metadata` links appropriately
- **Does not** create duplicate documents

### Re-running after adding new fields

If you add new translatable fields and re-run the script:

- New fields will be translated for all existing docs
- Existing translations remain unchanged for non-new fields
- `translation.metadata` links are preserved

---

## 8. Dependencies

### Existing Dependencies (already in package.json)

- `@vitalets/google-translate-api` - Google Translate library
- `@sanity/document-internationalization` - i18n support
- `@sanity/language-filter` - Language filtering (installed but unused)
- `next-sanity` - Sanity client

### New Usage (no new deps needed)

- Ollama: `OLLAMA_HOST` env var (default: `http://localhost:11434`)
- LibreTranslate: `LIBRETRANSLATE_URL` env var (default: `https://libretranslate.com/translate`)
- HuggingFace: `HUGGINGFACE_TOKEN` env var + `HUGGINGFACE_MODEL` env var

---

## 9. Edge Cases & Error Handling

### Network Failures

- Uses exponential backoff implicit in translation APIs
- Individual field failures don't stop the whole doc translation
- Errors logged but don't halt processing

### Missing Fields

- If a field is defined in `TRANSLATABLE_FIELDS` but doesn't exist on a doc, it's simply skipped
- Script checks `enDoc[field] !== undefined && enDoc[field] !== null` before translating

### Empty Content

- Empty fields are copied as-is, not translated
- Portable Text with no text content is preserved

### Already Translated

- Script checks if translation exists before creating
- If translation exists and has no fields to update, it's skipped
- `translation.metadata` already has the doc reference

---

## 10. Success Metrics

- ✅ All English docs for translatable types can be bulk-translated
- ✅ Target languages receive translated content for all defined fields
- ✅ Non-translatable fields are preserved as-is
- ✅ `translation.metadata` links are correctly maintained
- ✅ Script can be re-run idempotently
- ✅ New document types can be added with minimal config changes
- ✅ Translation provider can be swapped via env var

---

## 11. Notes & Assumptions

- Assumes English (`en`) is the source language for translation
- Target languages are defined in `languages.ts`: nl, ru, es, de
- Source documents must have `language == "en"` and `defined(slug.current)`
- Translation metadata type `translation.metadata` must exist in the schema (already set up via `@sanity/document-internationalization`)
- Script uses write token - ensure `SANITY_API_WRITE_TOKEN` is set
- No two-way sync (system → Google Calendar style one-way only)

### Future Considerations

- [ ] Add UI "Translate to all languages" button in studio (Option A from plan)
- [ ] Enable `@sanity/language-filter` plugin in `sanity.config.ts`
- [ ] Add preview/preview support for translations
- [ ] Add automatic translation on doc publish (Option C from plan)
- [ ] Add per-field machine translation quality scoring
- [ ] Add human review workflow for translated content