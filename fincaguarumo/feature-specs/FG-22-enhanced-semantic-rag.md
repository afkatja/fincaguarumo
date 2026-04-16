---
title: "Enhanced Semantic RAG with Multilingual Support"
linear_key: "FG-XXX"
description: "Production-ready semantic RAG with multilingual embeddings, caching, rate limiting, and streaming"
author: "Cascade AI"
created: "2026-04-15"
status: "draft"
---

## Overview

Implement production-ready semantic RAG system with full multilingual support, intelligent caching, IP-based rate limiting, and streaming responses for long-running operations.

## Current State

The semantic RAG system is implemented with:

- TogetherAI e5-base-instruct multilingual embeddings
- Supabase pgvector storage with hybrid search
- Basic API endpoints without caching or rate limiting
- Documentation for setup and deployment

## User Stories

As a **user**, I want:

- Fast multilingual semantic search in all supported languages (en, nl, es, ru, de)
- Consistent response times regardless of query language
- Reliable search results with proper source attribution
- Progress updates for long-running operations

As a **system administrator**, I want:

- Protection against API abuse through rate limiting
- Efficient resource usage through intelligent caching
- Monitoring of system performance and quality metrics
- Graceful handling of failures and fallbacks

## Acceptance Criteria

### AC1: Multilingual Embedding Support (FG-22)

- Use TogetherAI e5-base-instruct model for all 5 languages
- Implement language-specific text preprocessing
- Maintain consistent embedding quality across languages
- Provide fallback for unsupported languages

### AC1.1: Adding binary quantization for RAG (FG-25)

- Implement binary quantization for embedding storage
- Reduce storage requirements by 75%
- Maintain search accuracy within acceptable limits

### AC2: Tiered Caching System (FG-23)

- Query cache: 15 minutes TTL for frequent searches
- Content cache: 1 hour TTL for retrieved content
- Embedding cache: 24 hours TTL for generated embeddings
- Stats cache: 5 minutes TTL for system statistics
- Cache invalidation on content updates

### AC3: IP-Based Rate Limiting (FG-27)

- 100 requests per hour per IP address
- Separate limits for different endpoint types
- Graceful degradation when limits exceeded
- Rate limit headers in API responses

### AC4: Fast Query Reformulation (FG-26)

- Language-specific synonym expansion (max 3 terms)
- Common tourism/hospitality terms for each language
- Processing time under 50ms
- Cached reformulated queries

### AC5: Streaming Progress Updates (FG-24)

- SSE endpoints for long-running RAG operations
- Progress tracking for embedding generation
- Real-time status updates for content processing
- Integration with existing chat streaming infrastructure

## Technical Requirements

### Performance

- Query response time: <200ms for cached results
- Embedding generation: <2s for batch of 100
- Query reformulation: <50ms processing time
- Cache hit rate: >80% for frequent queries

### Scalability

- Support 100 concurrent users
- Handle 1000+ requests per hour
- Efficient memory usage for caching
- Horizontal scaling capability

### Reliability

- 99.9% uptime for RAG endpoints
- Graceful degradation on failures
- Multiple fallback layers
- Comprehensive error handling

## Implementation Constraints

### Dependencies

- Use existing TogetherAI e5-base-instruct model
- Leverage current Supabase pgvector setup
- Extend existing rate limiting pattern
- Use existing streaming infrastructure

### Architecture

- Follow existing code patterns and conventions
- No major framework introductions
- Maintain backward compatibility
- Use Next.js API routes (no netlify/functions)

### Security

- Input validation and sanitization
- Rate limiting for abuse prevention
- Secure API key management
- No sensitive data in logs

## Out of Scope

- User authentication system
- Real-time collaborative features
- Advanced analytics dashboard
- Custom embedding model training

## Success Metrics

- Query latency reduction: 50% improvement
- Cache hit rate: >80% for frequent queries
- Rate limiting effectiveness: Zero abuse incidents
- User satisfaction: >90% positive feedback
- System uptime: >99.9% availability

## Testing Strategy

### Unit Tests

- Cache TTL behavior validation
- Rate limiting threshold testing
- Query reformulation accuracy
- Multilingual preprocessing

### Integration Tests

- End-to-end query processing
- SSE streaming functionality
- Cache invalidation workflows
- Error handling and fallbacks

### Performance Tests

- Load testing for rate limits
- Cache performance benchmarks
- Query latency measurements
- Memory usage monitoring

### Manual Testing

- Multilingual query validation
- Progress update verification
- Rate limiting trigger testing
- User experience validation
