# Semantic RAG Deployment Guide

This guide covers deploying and managing the Semantic RAG system in production on Netlify.

## Overview

The Semantic RAG system provides semantic search capabilities for the Villa Bruno chatbot. It uses:

- **Production**: TogetherAI for embeddings (configured via `TOGETHER_API_KEY`)
- **Development**: Local Ollama for embeddings

## API Endpoints

### Base URL

```
https://your-domain.netlify.app/api/semantic-rag
```

### Endpoints

#### 1. Get RAG Status

```bash
GET /api/semantic-rag
```

**Response:**

```json
{
  "status": "ok",
  "stats": {
    "totalEmbeddings": 119,
    "contentTypes": { "faq": 20, "page": 15, ... },
    "languages": { "en": 25, "es": 24, ... },
    "lastUpdated": "2024-01-15T10:30:00Z"
  },
  "validation": {
    "isValid": true,
    "errors": [],
    "warnings": []
  },
  "activeJobs": []
}
```

#### 2. Validate RAG Setup

```bash
POST /api/semantic-rag
Content-Type: application/json

{
  "action": "validate"
}
```

#### 3. Initialize All Embeddings

```bash
POST /api/semantic-rag
Content-Type: application/json

{
  "action": "init"
}
```

**Response:**

```json
{
  "success": true,
  "jobId": "rag-1705312200000-abc123",
  "message": "Initialization started...",
  "sseUrl": "/api/semantic-rag/stream?jobId=rag-1705312200000-abc123"
}
```

#### 4. Rebuild Specific Languages

```bash
POST /api/semantic-rag
Content-Type: application/json

{
  "action": "rebuild",
  "languages": ["en", "es"]
}
```

#### 5. Get Job Status

```bash
GET /api/semantic-rag?jobId=<jobId>
```

#### 6. Subscribe to Progress (SSE)

```bash
GET /api/semantic-rag/stream?jobId=<jobId>
```

## Production Setup

### 1. Set Environment Variables

In the **Netlify Dashboard**, go to **Site Settings → Environment Variables** and add:

| Variable                       | Value                                                | Description                            |
| ------------------------------ | ---------------------------------------------------- | -------------------------------------- |
| `TOGETHER_API_KEY`             | Your API key from [together.ai](https://together.ai) | Required for production embeddings     |
| `EMBEDDING_PREFER_LOCAL`       | `false`                                              | Use TogetherAI instead of local Ollama |
| `EMBEDDING_FALLBACK_TO_REMOTE` | `true`                                               | Enable fallback if primary fails       |

### 2. Configure in netlify.toml

The following is already configured in `netlify.toml`:

```toml
[build.environment]
  NODE_VERSION = "20"

# SSE headers for progress streaming
[[headers]]
  for = "/api/semantic-rag/stream*"
  [headers.values]
    Cache-Control = "no-cache, no-transform"
    Connection = "keep-alive"
    X-Accel-Buffering = "no"
```

## Manual Initialization

After deploying to Netlify for the first time, you need to initialize the embeddings:

```bash
# Replace with your actual Netlify URL
NETLIFY_URL="https://your-site.netlify.app"

# Initialize all embeddings
curl -X POST "$NETLIFY_URL/api/semantic-rag" \
  -H "Content-Type: application/json" \
  -d '{"action": "init"}'

# Check status
curl "$NETLIFY_URL/api/semantic-rag"
```

## Deployment Pipeline Integration

### Option 1: Netlify Build Hook

1. Go to **Site Settings → Build & deploy → Build hooks**
2. Create a new hook (e.g., `rag-init`)
3. Add to your deployment script:

```bash
# In your CI/CD pipeline or build script
curl -X POST "$NETLIFY_URL/api/semantic-rag" \
  -H "Content-Type: application/json" \
  -d '{"action": "init"}'
```

### Option 2: Post-Build Script

Add to your `package.json`:

```json
{
  "scripts": {
    "deploy": "npm run build && netlify deploy --prod",
    "deploy:init": "netlify deploy --prod && curl -X POST \"$NETLIFY_URL/api/semantic-rag\" -H \"Content-Type: application/json\" -d '{\"action\":\"init\"}'"
  }
}
```

### Option 3: GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy and Initialize RAG

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          TOGETHER_API_KEY: ${{ secrets.TOGETHER_API_KEY }}
          EMBEDDING_PREFER_LOCAL: "false"

      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v2
        with:
          publish-dir: "./.next"
          production-branch: main
          github-token: ${{ secrets.GITHUB_TOKEN }}
          deploy-message: "Deploy from GitHub Actions"
        env:
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}

      - name: Initialize RAG
        run: |
          sleep 10  # Wait for deployment to complete
          curl -X POST "${{ secrets.NETLIFY_URL }}/api/semantic-rag" \
            -H "Content-Type: application/json" \
            -d '{"action":"init"}'
        env:
          NETLIFY_URL: ${{ secrets.NETLIFY_URL }}
```

## Monitoring

### Check System Status

```bash
curl "https://your-site.netlify.app/api/semantic-rag"
```

Expected output shows:

- `isValid: true` - System is working
- `totalEmbeddings > 0` - Embeddings are loaded
- `activeJobs: []` - No running operations

### Common Issues

1. **No embeddings found**: Run initialization (`action: init`)
2. **Embedding errors**: Check `TOGETHER_API_KEY` is set correctly
3. **Validation warnings**: Usually about local Ollama not available (expected in production)

## Supported Languages

The system supports these languages: `en`, `es`, `de`, `nl`, `ru`

## Timeout Considerations

Netlify Functions have a **10 second sync limit**. The RAG API handles this by:

- Running long operations (init, rebuild) as background jobs
- Providing SSE for real-time progress updates
- Storing job state for status queries

**Note**: For production use with high traffic, consider using Redis/KV for job storage to persist across function invocations.

## Security

- API endpoints are not authenticated by default
- For production, consider adding:
  - Basic auth
  - API key validation
  - Rate limiting

Example rate limiting with Netlify:

```toml
# Add to netlify.toml
[[redirects]]
  from = "/api/semantic-rag"
  to = "/api/semantic-rag"
  status = 200
  force = true
  conditions = { Role = ["admin"] }
```
