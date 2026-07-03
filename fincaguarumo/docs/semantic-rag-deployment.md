# Semantic RAG Deployment Guide

This guide covers deploying and managing the Semantic RAG system in production on Netlify.

## Overview

The Semantic RAG system provides semantic search capabilities for the Villa Bruno chatbot. It uses:

- **Production**: TogetherAI for embeddings (configured via `TOGETHER_API_KEY`)
- **Development**: Local Ollama for embeddings

## API Endpoints

### Base URL

```
https://your-domain.netlify.app/api/embeddings
```

### Endpoints

#### 1. Get API Information

```bash
GET /api/embeddings
```

**Response:**

```json
{
  "model": "intfloat/e5-base-instruct",
  "dimensions": 768,
  "endpoint": "/api/embeddings",
  "actions": [
    "generate - Generate embedding for single text",
    "generateBatch - Generate embeddings for multiple texts",
    "store - Store single embedding",
    "storeBatch - Store multiple embeddings",
    "exists - Check if embedding exists",
    "validate - Validate embedding format"
  ]
}
```

#### 2. Validate Embedding Format

```bash
POST /api/embeddings
Content-Type: application/json

{
  "action": "validate",
  "embedding": [0.1, 0.2, 0.3, ...]
}
```

**Response:**

```json
{
  "valid": true,
  "expectedDimensions": 768,
  "actualDimensions": 768
}
```

#### 3. Generate Single Embedding

```bash
POST /api/embeddings
Content-Type: application/json

{
  "action": "generate",
  "text": "Your text here"
}
```

**Response:**

```json
{
  "embedding": [0.1, 0.2, 0.3, ...],
  "dimensions": 768
}
```

#### 4. Generate Batch Embeddings

```bash
POST /api/embeddings
Content-Type: application/json

{
  "action": "generateBatch",
  "texts": ["Text 1", "Text 2", "Text 3"]
}
```

**Response:**

```json
{
  "embeddings": [[0.1, 0.2, ...], [0.3, 0.4, ...], [0.5, 0.6, ...]]
}
```

#### 5. Store Single Embedding

```bash
POST /api/embeddings
Content-Type: application/json

{
  "action": "store",
  "contentId": "unique-id",
  "contentType": "faq",
  "language": "en",
  "content": "Your content here",
  "embedding": [0.1, 0.2, 0.3, ...],
  "metadata": {"source": "manual"}
}
```

**Response:**

```json
{
  "success": true
}
```

#### 6. Store Batch Embeddings

```bash
POST /api/embeddings
Content-Type: application/json

{
  "action": "storeBatch",
  "embeddings": [
    {
      "contentId": "id-1",
      "contentType": "faq",
      "language": "en",
      "content": "Content 1",
      "embedding": [0.1, 0.2, ...],
      "metadata": {"source": "manual"}
    },
    {
      "contentId": "id-2",
      "contentType": "page",
      "language": "es",
      "content": "Contenido 2",
      "embedding": [0.3, 0.4, ...],
      "metadata": {"source": "manual"}
    }
  ]
}
```

**Response:**

```json
{
  "success": true
}
```

#### 7. Check if Embedding Exists

```bash
POST /api/embeddings
Content-Type: application/json

{
  "action": "exists",
  "contentId": "unique-id",
  "contentType": "faq"
}
```

**Response:**

```json
{
  "exists": true
}
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
```

## Manual Testing

After deploying to Netlify, you can test the embeddings API:

```bash
# Replace with your actual Netlify URL
NETLIFY_URL="https://your-site.netlify.app"

# Test API info
curl "$NETLIFY_URL/api/embeddings"

# Test embedding generation
curl -X POST "$NETLIFY_URL/api/embeddings" \
  -H "Content-Type: application/json" \
  -d '{"action": "generate", "text": "Hello world"}'

# Test embedding validation
curl -X POST "$NETLIFY_URL/api/embeddings" \
  -H "Content-Type: application/json" \
  -d '{"action": "validate", "embedding": [0.1, 0.2, 0.3]}'
```

## Deployment Pipeline Integration

### Option 1: Netlify Build Hook

1. Go to **Site Settings → Build & deploy → Build hooks**
2. Create a new hook (e.g., `embeddings-test`)
3. Add to your deployment script:

```bash
# In your CI/CD pipeline or build script
curl "$NETLIFY_URL/api/embeddings"
```

### Option 2: Post-Build Script

Add to your `package.json`:

```json
{
  "scripts": {
    "deploy": "npm run build && netlify deploy --prod",
    "deploy:test": "netlify deploy --prod && curl \"$NETLIFY_URL/api/embeddings\""
  }
}
```

### Option 3: GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy and Test Embeddings

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

      - name: Test Embeddings API
        run: |
          sleep 10  # Wait for deployment to complete
          curl "${{ secrets.NETLIFY_URL }}/api/embeddings"
        env:
          NETLIFY_URL: ${{ secrets.NETLIFY_URL }}
```

## Monitoring

### Check API Status

```bash
curl "https://your-site.netlify.app/api/embeddings"
```

Expected output shows:

- API endpoint information
- Available actions
- Model details and dimensions

### Common Issues

1. **API not responding**: Check deployment completed successfully
2. **Embedding errors**: Check `TOGETHER_API_KEY` is set correctly
3. **Invalid embedding format**: Ensure embeddings have correct dimensions (768 for intfloat/e5-base-instruct)

## Supported Languages

The system supports these languages: `en`, `es`, `de`, `nl`, `ru`

## Performance Considerations

Netlify Functions have a **10 second sync limit**. The embeddings API handles this by:

- Processing individual requests quickly
- Supporting batch operations for efficiency
- No streaming/SSE to avoid timeout issues

**Note**: For production use with high traffic, consider:

- Implementing caching for frequently accessed embeddings
- Using batch operations for multiple embeddings
- Monitoring API usage and response times

## Security

- API endpoints implement authentication and rate limiting
- **Authentication**: Admin token validation and Supabase auth for sensitive operations
- **Rate Limiting**: In-memory rate limiting with IP spoofing protection
- **Trusted Proxy**: Only trusts IP headers when running behind trusted proxies (Vercel, Netlify)

### Authentication Methods

1. **Admin Token** (for server-to-server calls):

   ```bash
   curl -X POST /api/embeddings \
     -H "Content-Type: application/json" \
     -H "x-admin-token: ${ADMIN_TOKEN}" \
     -d '{"action":"store","contentId":"test","contentType":"page","language":"en","content":"test","embedding":[...]}'
   ```

2. **Supabase Auth** (for admin users):
   - Requires valid Supabase session for sensitive operations
   - Public operations (generate, generateBatch, validate) have relaxed auth

### Rate Limiting

- **Chat API**: 100 requests per minute per IP
- **Embeddings API**: 50 requests per minute per IP
- **Memory Management**: Automatic pruning and eviction of expired entries
- **IP Validation**: Only trusts `x-forwarded-for` behind trusted proxies

### Production Rate Limiting

For distributed environments, consider using:

```toml
# Add to netlify.toml for additional edge rate limiting
[[redirects]]
  from = "/api/embeddings"
  to = "/api/embeddings"
  status = 200
  force = true
  conditions = { Role = ["admin"] }
```

Or use distributed stores:

- Redis with TTL for distributed rate limiting
- Upstash Redis for serverless environments
- Netlify KV for edge deployments
- Cloudflare KV for edge-first applications
