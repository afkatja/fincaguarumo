# Deployment Strategy for Semantic RAG with Local/Remote Embeddings

This document outlines the strategy for deploying the semantic RAG system to Netlify while supporting both local Ollama and remote TogetherAI embeddings.

## Challenge

Netlify functions run in serverless environments and cannot access local services like Ollama running on `localhost:11434`. We need a strategy that:

1. **Works in development** with local Ollama
2. **Works in production** on Netlify with remote embeddings
3. **Provides fallback** between local and remote
4. **Maintains performance** in both environments

## Solution Architecture

### Environment Detection

The system automatically detects the environment and chooses the appropriate embedding method:

```typescript
// Development: Use local Ollama with TogetherAI fallback
// Production: Use TogetherAI with local fallback (if available)
```

### Configuration Strategy

#### Development Environment (.env.local)
```env
# Prefer local embeddings in development
EMBEDDING_PREFER_LOCAL=true
EMBEDDING_FALLBACK_TO_REMOTE=true
EMBEDDING_LOCAL_TIMEOUT=10000

# Local Ollama configuration
OLLAMA_HOST=http://localhost:11434

# Remote TogetherAI (fallback)
TOGETHER_API_KEY=your_together_ai_key_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

#### Production Environment (Netlify)
```env
# Prefer remote embeddings in production
EMBEDDING_PREFER_LOCAL=false
EMBEDDING_FALLBACK_TO_REMOTE=true
EMBEDDING_LOCAL_TIMEOUT=5000

# Remote TogetherAI (primary)
TOGETHER_API_KEY=your_together_ai_key_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Implementation Details

### Hybrid Embedding Service

The `embeddings-hybrid.ts` automatically handles the switching:

1. **Checks configuration** for preferred method
2. **Tests availability** of local Ollama
3. **Falls back gracefully** if preferred method fails
4. **Provides status** for monitoring

### Environment Variables

| Variable | Development | Production | Description |
|-----------|-------------|------------|-------------|
| `EMBEDDING_PREFER_LOCAL` | `true` | `false` | Prefer local embeddings |
| `EMBEDDING_FALLBACK_TO_REMOTE` | `true` | `true` | Enable fallback to remote |
| `EMBEDDING_LOCAL_TIMEOUT` | `10000` | `5000` | Local service timeout (ms) |
| `TOGETHER_API_KEY` | Optional | Required | TogetherAI API key |
| `OLLAMA_HOST` | `http://localhost:11434` | Not used in production |

### Deployment Flow

#### Development Setup
1. Install and run Ollama locally:
   ```bash
   ollama pull mistral
   ollama serve
   ```

2. Configure development environment:
   ```env
   EMBEDDING_PREFER_LOCAL=true
   TOGETHER_API_KEY=your_key_here  # Fallback
   ```

3. Test locally:
   ```bash
   npm run semantic-rag:test
   ```

#### Production Setup (Netlify)

1. Set Netlify environment variables:
   - `EMBEDDING_PREFER_LOCAL=false`
   - `TOGETHER_API_KEY=your_production_key`
   - `NEXT_PUBLIC_SUPABASE_URL=...`
   - `SUPABASE_SERVICE_ROLE_KEY=...`

2. Deploy to Netlify:
   ```bash
   npm run build
   netlify deploy --prod
   ```

3. The system will automatically use TogetherAI embeddings

## Performance Considerations

### Local Ollama (Development)
- **Pros**: Free, fast, no API limits
- **Cons**: Requires local setup, not available in production
- **Performance**: ~50-100ms per embedding

### TogetherAI (Production)
- **Pros**: Reliable, serverless-compatible
- **Cons**: API costs, rate limits
- **Performance**: ~200-500ms per embedding

### Hybrid Approach
- **Development**: Local first, remote fallback
- **Production**: Remote first, local fallback (if available)
- **Graceful degradation**: Always works with best available method

## Monitoring and Debugging

### Status API

The system provides embedding status via API:

```bash
# Check current status
curl "http://localhost:3000/api/embeddings?action=validate"

# Response includes:
{
  "isValid": true,
  "issues": [],
  "recommendations": [],
  "embeddingStatus": {
    "localAvailable": true,
    "remoteAvailable": true,
    "preferredMethod": "local"
  }
}
```

### Logging

The system logs which method is being used:

```
🏠 Attempting local embedding generation...
✅ Local embedding generation successful

# Or

🌐 Attempting remote embedding generation...
✅ Remote embedding generation successful
```

## Cost Optimization

### Development Costs
- **Local**: $0 (hardware costs only)
- **Remote**: Minimal (fallback usage only)

### Production Costs
- **Local**: Not applicable
- **Remote**: TogetherAI API usage
  - ~$0.0001 per 1K tokens
  - Estimated: $1-10/month for moderate usage

### Cost Saving Strategies

1. **Cache embeddings**: Store frequently used embeddings
2. **Batch processing**: Process multiple texts together
3. **Smart fallback**: Only use remote when necessary

## Security Considerations

### API Keys
- **Development**: Local in `.env.local` (not committed)
- **Production**: Netlify environment variables (encrypted)
- **Fallback**: Both methods available for redundancy

### Network Security
- **Local**: Only accessible from localhost
- **Remote**: HTTPS to TogetherAI API
- **Supabase**: Always use HTTPS

## Testing Strategy

### Local Testing
```bash
# Test with local Ollama
EMBEDDING_PREFER_LOCAL=true npm run semantic-rag:test

# Test hybrid fallback
EMBEDDING_PREFER_LOCAL=true TOGETHER_API_KEY=invalid_key npm run semantic-rag:test
```

### Production Testing
```bash
# Test remote-only setup
EMBEDDING_PREFER_LOCAL=false npm run semantic-rag:test

# Test in Netlify environment
# Deploy and test via production URL
```

## Migration Path

### Phase 1: Development Setup
1. Set up local Ollama
2. Configure hybrid embeddings
3. Test all functionality
4. Verify fallback behavior

### Phase 2: Production Deployment
1. Configure Netlify environment
2. Deploy with remote embeddings
3. Test production functionality
4. Monitor performance

### Phase 3: Optimization
1. Monitor embedding usage
2. Optimize caching strategies
3. Adjust configuration based on metrics

## Troubleshooting

### Common Issues

#### "Local embedding not available"
```bash
# Check Ollama status
curl http://localhost:11434/api/tags

# Restart Ollama if needed
ollama serve
```

#### "Remote embedding fails"
```bash
# Check API key
echo $TOGETHER_API_KEY

# Test TogetherAI directly
curl -X POST "https://api.together.xyz/v1/embeddings" \
  -H "Authorization: Bearer $TOGETHER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "intfloat/e5-base-instruct", "input": "test"}'
```

#### "Fallback not working"
- Check environment variables
- Verify `EMBEDDING_FALLBACK_TO_REMOTE=true`
- Check network connectivity
- Review error logs

## Future Enhancements

### Advanced Fallback Strategies
- **Multiple remote providers**: Add OpenAI, Cohere as fallbacks
- **Edge functions**: Deploy lightweight embedding service to edge
- **CDN embeddings**: Cache embeddings at CDN level

### Performance Optimization
- **Async processing**: Parallel embedding generation
- **Smart batching**: Group similar queries
- **Predictive caching**: Pre-generate likely embeddings

### Monitoring
- **Usage analytics**: Track embedding method usage
- **Performance metrics**: Monitor response times
- **Cost tracking**: Monitor API costs

---

This strategy ensures the semantic RAG system works seamlessly in both development and production environments, providing the best user experience while optimizing for costs and performance.
