# Translation Provider Setup

This document describes how to configure the available translation providers for both the Studio "Auto Translate" tool and the bulk translation CLI script.

## Overview

The translation system supports 6 providers via the `TRANSLATION_PROVIDER` environment variable:

| Provider | Code | Cost | Quality | Use Case |
|----------|------|------|---------|----------|
| Google Cloud Translate | `google-cloud` | Paid API | Excellent | Production, high-quality needs |
| Google Free (unofficial) | `google-free` | Free | Good | Development, testing |
| Ollama (local LLM) | `ollama` | Free (local) | Good | Privacy, offline, local control |
| LibreTranslate | `libretranslate` | Free (hosted/self-hosted) | Good | Optional API key |
| Hugging Face Inference | `huggingface` | Free tier / Paid | Variable | Open models, experimentation |
| DeepL | `deepl` | Paid API | Excellent | Production, highest quality |

## Configuration

### 1. Google Cloud Translate (Recommended for Production)

**Environment Variables:**
```bash
# Production (Next.js)
NEXT_PUBLIC_GOOGLE_CLOUD_API_KEY=your_api_key_here

# Development (script)
GOOGLE_CLOUD_API_KEY_TEST=your_api_key_here
```

**Setup:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Cloud Translation API
3. Create an API key with appropriate restrictions
4. Add the key to your environment variables

**Usage:**
```bash
# API route (Studio tool) - uses env var automatically
TRANSLATION_PROVIDER=google-cloud

# CLI script
TRANSLATION_PROVIDER=google-cloud npm run translate:sanity-ai
```

---

### 2. Google Free (Unofficial) - No API Key Required

Uses the `@vitalets/google-translate-api` package (unofficial, rate-limited).

**Environment Variables:** None required.

**Usage:**
```bash
TRANSLATION_PROVIDER=google-free npm run translate:sanity-ai
```

⚠️ **Warning:** This uses an unofficial API and may be rate-limited or blocked. Not recommended for production or bulk translations.

---

### 3. Ollama (Local LLM) - Privacy-First

Runs completely locally on your machine. No data leaves your network.

**Prerequisites:**
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model (e.g., llama3.2)
ollama pull llama3.2

# Start Ollama server
ollama serve
```

**Environment Variables:**
```bash
# Optional - defaults shown
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

**Usage:**
```bash
# Start Ollama first
ollama serve

# Then run translation
TRANSLATION_PROVIDER=ollama npm run translate:sanity-ai
```

**API Route (Studio):**
Set `TRANSLATION_PROVIDER=ollama` in your deployment environment variables.

---

### 4. LibreTranslate - Self-Hosted or Hosted

Free, open-source translation API. Can use the public instance or self-host.

**Environment Variables:**
```bash
# Optional - defaults to public instance
LIBRETRANSLATE_URL=https://libretranslate.com/translate

# Optional - API key for instances that require one (only sent when set)
# LIBRETRANSLATE_API_KEY=your_key_here

# Or self-hosted:
# LIBRETRANSLATE_URL=https://your-libretranslate-instance.com/translate
```

**Usage:**
```bash
TRANSLATION_PROVIDER=libretranslate npm run translate:sanity-ai
```

**Self-Hosting (Docker):**
```bash
docker run -d -p 5000:5000 libretranslate/libretranslate
# Then set LIBRETRANSLATE_URL=http://localhost:5000/translate
```

---

### 5. Hugging Face Inference API

Uses Hugging Face's serverless inference API for open models.

**Environment Variables:**
```bash
# Required
HUGGINGFACE_TOKEN=hf_your_token_here

# Optional - defaults shown
HUGGINGFACE_MODEL=meta-llama/Meta-Llama-3.1-8B-Instruct
```

**Setup:**
1. Create a [Hugging Face account](https://huggingface.co/)
2. Generate an [access token](https://huggingface.co/settings/tokens) with "Inference" permission
3. Choose a model from the [Hugging Face Hub](https://huggingface.co/models) (must support text generation)

**Usage:**
```bash
TRANSLATION_PROVIDER=huggingface npm run translate:sanity-ai
```

---

### 6. DeepL - Highest Quality Translation

DeepL provides the highest quality machine translation, especially for European languages. Requires a paid API key (free tier available with 500,000 characters/month).

**Environment Variables:**
```bash
# Required
DEEPL_AUTH_KEY=your_deepl_auth_key_here

# Optional - defaults shown
DEEPL_FORMALITY=default  # Options: default, more, less (for supported languages like German)
```

**Setup:**
1. Create a [DeepL account](https://www.deepl.com/pro-api)
2. Get your API key from the [DeepL API dashboard](https://www.deepl.com/pro-api?cta=header-pro-api)
3. Add the key to your environment variables

**Usage:**
```bash
# API route (Studio tool) - uses env var automatically
TRANSLATION_PROVIDER=deepl

# CLI script
TRANSLATION_PROVIDER=deepl npm run translate:sanity-ai
```

**Supported Languages:**
DeepL supports 30+ languages including all configured target languages (nl, es, ru, de). DeepL uses uppercase language codes (e.g., NL, ES, RU, DE). The system automatically handles the case conversion.

**Formality Support:**
For languages that support formality (German, French, Italian, Spanish, Dutch, Polish, Portuguese, Russian, Japanese), you can set `DEEPL_FORMALITY=more` or `DEEPL_FORMALITY=less` to control the tone.

### Studio "Auto Translate" Tool (Per-Document)

1. Open Sanity Studio → Tools → Auto Translate
2. Select a document
3. Click "Translate to Spanish, Dutch, Russian & German"
4. Uses `TRANSLATION_PROVIDER` from environment variables

**Override provider per-request (API):**
```bash
curl -X POST /api/translate \
  -H "Content-Type: application/json" \
  -d '{
    "docId": "abc123",
    "docType": "page",
    "provider": "ollama"
  }'
```

### Bulk Translation CLI Script

Translates all English documents for all configured types to all target languages.

```bash
# Default (google-cloud)
npm run translate:sanity-ai

# With specific provider
TRANSLATION_PROVIDER=ollama npm run translate:sanity-ai
TRANSLATION_PROVIDER=libretranslate npm run translate:sanity-ai
TRANSLATION_PROVIDER=huggingface npm run translate:sanity-ai
TRANSLATION_PROVIDER=google-free npm run translate:sanity-ai
TRANSLATION_PROVIDER=deepl npm run translate:sanity-ai
```

**Required Environment Variables for CLI:**
```bash
# Sanity credentials (required for all providers)
SANITY_API_WRITE_TOKEN=your_write_token
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_STUDIO_API_VERSION=2024-01-01

# Provider-specific (see above)
TRANSLATION_PROVIDER=google-cloud
# ...provider-specific vars
```

---

## Validation

Provider credentials are validated on the first translation call (through
`getDefaultOptions` → `validateProviderOptions`), not at startup. If a required
variable is missing for the effective provider, you'll see a clear error message:

```
Error: Google Cloud Translate API key not configured. Set NEXT_PUBLIC_GOOGLE_CLOUD_API_KEY (production) or GOOGLE_CLOUD_API_KEY_TEST (development).
```

This prevents silent failures during translation. `google-free` requests do not
require a Google Cloud key.

---

## Target Languages

Configured in `languages.ts`:
- `en` - English (source)
- `nl` - Nederlands
- `es` - Español
- `ru` - Русский
- `de` - Deutsch

To add/remove languages, update `languages.ts` and re-run translations.

---

## Translatable Document Types

Translatable types and their per-field treatments (`translate` / `copyAsIs`)
are defined in `FIELDS_CONFIG` in `src/config/translatable-fields.ts`:

- `page`
- `post`
- `tour`
- `home`
- `faq`
- `activityBlock`
- `whyChooseVillaBruno`
- `locationPage`
- `accommodation`

To add a new type, list its fields once in `FIELDS_CONFIG` (see
[Feature Spec: Translations Workaround](../feature-specs/FG-translations-workaround.md#4-adding-a-new-document-type). The translate and copy-fields routes derive their field sets from this config.