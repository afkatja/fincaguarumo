# Translations Workaround Plan

**Repo**: `fincaguarumo/fincaguarumo`  
**Languages**: en (default), nl, es, ru, de  
**Status**: Planning — ready for implementation

---

## Current State

- **Document-level i18n** via `@sanity/document-internationalization` (10 types), linked by `language` field + `translation.metadata` docs matched by slug
- **Field-level i18n** via `sanity-plugin-internationalized-array` for `dialog` type (UI strings)
- **Auto-translate API** (`/api/translate`) + studio `TranslateTool` translates a subset of text fields, one doc at a time
- `scripts/translate-ai.ts` translates Next.js JSON messages only (not Sanity content)
- `@sanity/language-filter` is installed but **unused**
- `translation.metadata` type is not defined in local schema (created at runtime via API)
- Initial value templates referenced (`page-en`, `page-nl`, etc.) have no actual template definitions registered

---

## Part 1: Content Classification (Translate vs. Copy vs. Skip)

Define per-schema which fields to translate, copy as-is, or skip.

| Category | Fields | Action |
|----------|--------|--------|
| **Copy as-is** (shared across languages) | `mainImage`, `slideshow`, `background_media`, `categories`, `author`, numbers, booleans, geopoints, slugs, URLs, PII | Duplicate reference, do not translate |
| **Translate** | `title`, `subtitle`, `description`, `body` (blockContent), `hero_title`, `hero_slogan`, `hero_body`, `intro_body`, `question`, `answer`, `answerBlockContent`, `tldr`, `openGraph.title/description`, highlight/features arrays, seoKeywords, alt/caption on images | Translate text |
| **Skip** (transactional/PII/user-generated) | `booking`, `review`, `guestName`, `email`, `phone`, `reviewText`, `author.name` | Do not clone/translate |

**Implementation**: Add a `translatableFields` config per schema type (map of field name → `translate` | `copy` | `skip`), consumed by the automation script.

---

## Part 2: Three Implementation Approaches

### Option A: Extend `/api/translate` route + studio tool (bulk mode)

Leverage existing translation API route and studio `TranslateTool`.

- Add a bulk endpoint to `/api/translate` that accepts multiple document IDs and target languages
- Add a "Translate to all languages" bulk button in the studio `TranslateTool`
- Expand `TRANSLATABLE_FIELDS` in the API route to cover all 8 translatable types (`faq`, `page`, `post`, `tour`, `home`, `activityBlock`, `whyChooseVillaBruno`, `locationPage`, `accommodation`)

| Pros | Cons |
|------|------|
| Reuses existing infra (Google Translate client, `translation.metadata` linking, Portable Text handling) | Still requires user to trigger (per doc or bulk button) |
| Minimal new code | Translation happens at request time, not on document creation |
| Works within Sanity Studio UI | |

**Files to change**: `src/app/api/translate/route.ts`, `src/app/studio/tool/translate.tsx`

---

### Option B: Standalone CLI script (bulk, off-cycle)

New script `scripts/translate-sanity-ai.ts` modeled on `translate-ai.ts`:

1. Fetches all English (`language == "en"`) documents for translatable types
2. For each target language, clones the doc, sets `language`, copies non-translatable fields as-is, translates translatable text fields
3. Creates/updates `translation.metadata` links
4. Writes back via `writeClient`

| Pros | Cons |
|------|------|
| Full bulk automation; can run as cron/nightly | Runs outside studio; translators can't review before publish |
| No studio interaction needed | Risk of publishing unreviewed translations |
| Can use any provider from `translate-ai.ts` (google/ollama/libretranslate/huggingface) | |

**Files to change**: New `scripts/translate-sanity-ai.ts`, add npm script to `package.json`

---

### Option C: Sanity document publish hook (auto-on-create)

Sanity function / documentEventHandler that auto-clones + translates when an English doc is published.

| Pros | Cons |
|------|------|
| Zero manual effort; translations exist immediately after source doc publish | Requires Sanity Functions/deployed backend or custom plugin |
| | Translations auto-publish without review |
| | Highest complexity; couples translation to publish lifecycle |

**Files to change**: Sanity function + documentEventHandler, or custom Sanity plugin with `onPublish` hook

---

## Part 3: UI/UX Bug Fix — Double Language Dropdown

**Root cause**: In `getLanguageItems` (`src/sanity/structure/index.ts:69-101`), each language list item uses `.initialValueTemplates([S.initialValueTemplateItem(`${schemaType}-${lang.id}`)])`. Sanity shows the language list as the first selector, then inside that list the template picker shows again. The template IDs (`page-en`, `page-nl`, etc.) are referenced but **no actual initial value template definitions exist** in the codebase (no `src/sanity/templates/` directory).

**Fix options**:

1. **Remove `initialValueTemplates` from `getLanguageItems`** — the language list itself is the selector; clicking "Create" opens the doc form directly with `language` pre-set via `initialValue`.
2. **Define actual initial value templates** (`id: \`${schemaType}-${lang.id}\`, `initialValue: { language: lang.id }`) registered in sanity config — but keeps the two-step flow unless combined with option 1.
3. **Simplest fix**: Replace `.initialValueTemplates([...])` with `.initialValue({ language: lang.id })` on the document list, and remove the template-item references. Then the language dropdown (step 1) is the only selector, and the doc form opens with language pre-filled.

**Files to change**: `src/sanity/structure/index.ts`

---

## Part 4: Recommended Implementation Phases

| Phase | Work |
|-------|------|
| **1** | Fix the double-dropdown bug in `src/sanity/structure/index.ts` (remove redundant `initialValueTemplates`, pre-set `language` via `initialValue`) |
| **2** | Add `translatableFields` config per schema type (classify translate/copy/skip) |
| **3** | Build bulk translation CLI script (Option B) using `translate-ai.ts` providers + Sanity `writeClient` |
| **4** | Expand `/api/translate` `TRANSLATABLE_FIELDS` + add bulk "translate all" to studio tool (Option A) as studio-facing alternative |
| **5** | (Optional) Enable `@sanity/language-filter` plugin in `sanity.config.ts` for better studio language filtering |

---

## Open Questions Before Implementation

1. **Translation provider**: Should the Sanity bulk script use Google Translate (existing `/api/translate` path), or reuse `translate-ai.ts`'s multi-provider (ollama/libretranslate) to avoid API costs?
2. **Publish behavior**: Should translated documents be created as drafts (for review) or published immediately?
3. **Scope**: Start with just `page`, `post`, `tour`, `home` (already in `TRANSLATABLE_FIELDS`) or all translatable types including `activityBlock`, `whyChooseVillaBruno`, `locationPage`, `accommodation`?

---

## Next Steps

Confirm answers to the open questions, then select an approach (A, B, or combination) to proceed with implementation. No files have been modified yet — this is a plan only.