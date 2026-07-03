# Semantic RAG System Setup Guide

This guide explains how to set up and use the new semantic RAG (Retrieval-Augmented Generation) system for the Villa Bruno chatbot.

## Overview

The semantic RAG system replaces the keyword-based search with true semantic understanding using vector embeddings and similarity matching. This provides:

- **True Semantic Similarity**: Understands meaning beyond keywords
- **Better Context Understanding**: Handles synonyms and related concepts
- **Improved Accuracy**: More relevant content retrieval
- **Multilingual Support**: Better cross-language understanding

## Prerequisites

### Environment Variables

Add these to your `.env.local` file:

```env
# TogetherAI for embeddings
TOGETHER_API_KEY=your_together_ai_api_key_here

# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Existing Mistral API
MISTRAL_API_KEY=your_mistral_api_key
```

### TogetherAI Setup

1. Sign up at [TogetherAI](https://together.ai)
2. Get your API key
3. Add it to `TOGETHER_API_KEY` environment variable

## Installation

### 1. Install Dependencies

```bash
npm install langchain @langchain/community --legacy-peer-deps
```

### 2. Run Database Migration

The vector extension and tables are created via migration:

```sql
-- Run this in Supabase SQL editor
-- File: supabase/migrations/004_add_vector_extension.sql
```

Or apply the migration automatically if you have Supabase CLI set up:

```bash
supabase db push
```

### 3. Initialize the System

Run the initialization script:

```bash
npm run semantic-rag:init
```

This will:
- Validate the setup
- Create embeddings for all content in all languages
- Provide statistics

## Usage

### Automatic Integration

The chatbot automatically uses semantic search when available. The `buildRAGContext` function in `src/lib/rag-context-builder.ts` will:

1. Try to use semantic RAG first
2. Fall back to keyword-based RAG if semantic is not available
3. Log the approach being used

### Manual Management

#### Check System Status

```bash
# Validate setup
curl "http://localhost:3000/api/embeddings?action=validate"

# Get statistics
curl "http://localhost:3000/api/embeddings?action=stats"
```

#### Rebuild Embeddings

```bash
# Rebuild all content for English
npm run semantic-rag:init

# Rebuild specific content type
curl -X POST "http://localhost:3000/api/embeddings" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "rebuild",
    "contentType": "faq",
    "language": "en"
  }'

# Rebuild all content for specific language
curl -X POST "http://localhost:3000/api/embeddings" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "rebuild",
    "language": "es"
  }'
```

## Architecture

### Core Components

1. **Embeddings Service** (`src/lib/semantic-rag/embeddings.ts`)
   - Generates embeddings using TogetherAI e5-base-instruct model
   - Handles batch processing
   - Stores embeddings in Supabase

2. **Vector Store** (`src/lib/semantic-rag/vector-store.ts`)
   - Supabase integration with pgvector
   - Semantic and hybrid search functions
   - Content management utilities

3. **Document Loaders** (`src/lib/semantic-rag/document-loaders.ts`)
   - Processes Sanity content for embedding
   - Handles all content types (FAQs, tours, reviews, etc.)
   - Multilingual support

4. **Retrieval Chains** (`src/lib/semantic-rag/retrieval-chains.ts`)
   - Advanced retrieval strategies
   - Intent detection
   - Multi-step and conversational retrieval

5. **Context Builder** (`src/lib/semantic-rag/semantic-context-builder.ts`)
   - Main orchestration
   - Fallback mechanisms
   - Validation and stats

### Search Strategies

#### Semantic Search
- Pure vector similarity matching
- Best for conceptual queries
- Handles synonyms and related concepts

#### Hybrid Search
- Combines semantic + keyword matching
- 70% semantic weight, 30% keyword weight
- Best for queries with specific terms

#### Adaptive Retrieval
- Automatically chooses strategy based on query
- Precise: High threshold, semantic-only
- Broad: Low threshold, hybrid approach
- Conversational: Includes history context

## Content Types Supported

- **FAQs**: Questions and answers
- **Pages**: Villa descriptions and details
- **Tours**: Activities and excursions
- **Reviews**: Guest feedback and ratings
- **Posts**: Blog articles and local attractions
- **Home**: Homepage content
- **Amenities**: Property features
- **Pricing Rules**: Seasonal pricing
- **Payment Methods**: Payment options
- **Cancellation Policies**: Booking policies
- **Logistics**: Check-in/out, directions, etc.

## Languages Supported

- English (en)
- Spanish (es)
- German (de)
- Dutch (nl)
- Russian (ru)

## Performance Optimization

### Caching

The system includes built-in caching:
- Embedding generation results
- Vector search results
- Content processing

### Batch Processing

- Embeddings are generated in batches of 100
- Content is processed in batches of 50
- Reduces API calls and improves performance

### Indexing

- Uses IVFFlat index for vector similarity
- Optimized for larger datasets
- Configurable list count (default: 100)

## Monitoring

### Logs

The system provides detailed logging:
- Search strategy used
- Processing times
- Fallback reasons
- Error details

### Statistics

Track these metrics:
- Total embeddings count
- Content type distribution
- Language distribution
- Search performance

### API Endpoints

- `GET /api/embeddings?action=validate` - Validate setup
- `GET /api/embeddings?action=stats` - Get statistics
- `POST /api/embeddings` - Rebuild embeddings

## Troubleshooting

### Common Issues

#### "TOGETHER_API_KEY not set"
```bash
export TOGETHER_API_KEY=your_key_here
# Or add to .env.local
```

#### "Vector search functions not available"
- Run the database migration
- Check pgvector extension is enabled
- Verify functions exist in Supabase

#### "No embeddings found"
- Run the initialization script
- Check content exists in Sanity
- Verify language codes match

#### "Slow search performance"
- Check vector indexes are created
- Consider reducing context size
- Monitor batch processing efficiency

### Validation Script

```bash
npm run semantic-rag:validate
```

This will check:
- Environment variables
- API connectivity
- Database setup
- Function availability

## Migration from Keyword-Based

The system includes automatic fallback:
1. Tries semantic search first
2. Falls back to keyword-based if issues
3. Logs the approach used
4. Maintains backward compatibility

No changes needed to existing chatbot code - the upgrade is transparent.

## Best Practices

### Content Quality

- Keep content updated in Sanity
- Use consistent language codes
- Add relevant keywords and metadata
- Maintain content structure

### Performance

- Monitor embedding generation times
- Use batch processing for large updates
- Cache frequently accessed content
- Regular maintenance and updates

### User Experience

- Test queries in all languages
- Monitor relevance scores
- Collect user feedback
- Adjust thresholds based on usage

## Future Enhancements

### Planned Features

- Real-time embedding updates
- Advanced query reformulation
- Personalized search results
- Analytics dashboard
- A/B testing framework

### Extensions

- Additional embedding models
- Custom retrieval strategies
- Advanced filtering options
- Integration with other AI services

## Support

For issues or questions:

1. Check the logs for detailed error messages
2. Run the validation script
3. Review this documentation
4. Check the Supabase and TogetherAI status pages

## Security Considerations

- API keys are stored securely in environment variables
- Supabase RLS policies protect data
- Rate limiting on API endpoints
- Input validation and sanitization

---

This semantic RAG system significantly improves the chatbot's ability to understand and respond to user queries with true semantic understanding rather than simple keyword matching.
