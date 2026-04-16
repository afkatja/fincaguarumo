# Qdrant Cloud Setup Guide

This guide explains how to configure your application to use Qdrant Cloud for both development and production environments.

## Overview

**Recommendation**: Use Qdrant Cloud for both development and production environments for:
- Data consistency across environments
- Better performance and reliability
- Simplified development workflow
- Professional monitoring and security

## Prerequisites

### 1. Qdrant Cloud Cluster

You should have already created:
- **Cluster Name**: `finca-guarumo-embeddings`
- **API Key**: Available from Qdrant Cloud dashboard
- **Cluster URL**: Available from Qdrant Cloud dashboard

### 2. Environment Configuration

Copy `.env.qdrant-cloud.example` to `.env.local`:

```bash
cp .env.qdrant-cloud.example .env.local
```

## Configuration

### Basic Setup

Add these to your `.env.local`:

```env
# Vector store configuration
VECTOR_STORE=qdrant
ENABLE_BINARY_QUANTIZATION=true

# Qdrant Cloud Cluster (finca-guarumo-embeddings)
QDRANT_URL=https://your-cluster-endpoint.qdrant.tech
QDRANT_API_KEY=your_qdrant_cloud_api_key_here

# Environment
NODE_ENV=development  # Change to 'production' for production

# Existing required variables
TOGETHER_API_KEY=your_together_ai_api_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Environment-Specific API Keys (Optional)

For enhanced security, you can use different API keys per environment:

```env
# Development API key
QDRANT_DEV_API_KEY=dev_cluster_api_key

# Production API key
QDRANT_PROD_API_KEY=prod_cluster_api_key

# Fallback (used if above not set)
QDRANT_API_KEY=fallback_api_key
```

The system will automatically select the appropriate key based on `NODE_ENV`.

## Migration to Cloud

### 1. Test Migration (Dry Run)

```bash
npm run migrate:to-cloud:dry-run
```

This will test the migration without actually transferring data.

### 2. Perform Migration

```bash
npm run migrate:to-cloud
```

This will migrate all 119 embeddings from Supabase to Qdrant Cloud.

### 3. Validate Migration

```bash
npm run migrate:to-cloud:validate
```

This verifies that all embeddings were successfully migrated.

### 4. Clear and Re-migrate (if needed)

```bash
npm run migrate:to-cloud:clear
```

This clears existing data and performs a fresh migration.

## Environment Strategy

### Development Environment

```env
NODE_ENV=development
VECTOR_STORE=qdrant
ENABLE_BINARY_QUANTIZATION=true
QDRANT_URL=https://finca-guarumo-embeddings.qdrant.tech
QDRANT_API_KEY=your_dev_api_key
```

### Production Environment

```env
NODE_ENV=production
VECTOR_STORE=qdrant
ENABLE_BINARY_QUANTIZATION=true
QDRANT_URL=https://finca-guarumo-embeddings.qdrant.tech
QDRANT_API_KEY=your_prod_api_key
```

## Deployment Configuration

### Netlify Environment Variables

Set these in your Netlify dashboard:

**Build & Deploy Settings > Environment Variables**:

```
VECTOR_STORE=qdrant
ENABLE_BINARY_QUANTIZATION=true
QDRANT_URL=https://finca-guarumo-embeddings.qdrant.tech
QDRANT_API_KEY=your_production_api_key
NODE_ENV=production
```

### Environment-Specific Deployments

For different deployment targets:

#### Staging/Preview Deployments
```env
VECTOR_STORE=qdrant
QDRANT_API_KEY=staging_api_key
NODE_ENV=development
```

#### Production Deployments
```env
VECTOR_STORE=qdrant
QDRANT_API_KEY=production_api_key
NODE_ENV=production
```

## Benefits of Cloud-First Approach

### Data Consistency
- Same embeddings across all environments
- No data drift between local and production
- Consistent search results everywhere

### Development Benefits
- No local Docker setup required
- Instant environment for new developers
- Realistic performance testing
- Shared development data

### Operational Benefits
- Professional monitoring and alerting
- Automated backups and disaster recovery
- Managed security and updates
- 99.9% uptime SLA

### Performance
- Faster than local Docker instances
- Optimized for vector operations
- Global CDN for faster access
- Automatic scaling

## Monitoring and Maintenance

### Health Checks

Monitor your cluster health:

```bash
# Check cluster status
curl -H "api-key: $QDRANT_API_KEY" \
     https://finca-guarumo-embeddings.qdrant.tech/health

# Check collection info
curl -H "api-key: $QDRANT_API_KEY" \
     https://finca-guarumo-embeddings.qdrant.tech/collections/content_embeddings
```

### Performance Monitoring

The application provides built-in performance monitoring:

```typescript
import { getPerformanceInfo } from './lib/semantic-rag/vector-store-adapter'

const perf = getPerformanceInfo()
console.log(perf)
// {
//   vectorStore: 'qdrant',
//   binaryQuantization: true,
//   expectedSpeedup: '40x faster search',
//   memoryReduction: '32x less memory usage'
// }
```

## Troubleshooting

### Common Issues

#### "Qdrant connection failed"
```bash
# Check API key and URL
curl -H "api-key: $QDRANT_API_KEY" \
     https://finca-guarumo-embeddings.qdrant.tech/health

# Verify environment variables
echo $QDRANT_URL
echo $QDRANT_API_KEY
```

#### "Migration validation failed"
```bash
# Check both counts
npm run migrate:to-qdrant:validate  # Local
npm run migrate:to-cloud:validate   # Cloud

# Re-migrate if needed
npm run migrate:to-cloud:clear
```

#### "Performance not improved"
```bash
# Verify binary quantization is enabled
curl https://finca-guarumo-embeddings.qdrant.tech/collections/content_embeddings | jq '.result.config.quantization_config'

# Should show: { "binary": {} }
```

### Rollback Procedure

If you need to rollback to pgvector:

```env
# In .env.local
VECTOR_STORE=pgvector
ENABLE_BINARY_QUANTIZATION=false
```

Then restart your application.

## Security Best Practices

### API Key Management

1. **Use environment-specific keys**: Different keys for dev/staging/prod
2. **Regular key rotation**: Change API keys periodically
3. **Monitor usage**: Check Qdrant Cloud dashboard for unusual activity
4. **Principle of least privilege**: Use minimal required permissions

### Network Security

1. **HTTPS only**: Qdrant Cloud requires HTTPS
2. **VPC peering**: Consider for production deployments
3. **IP restrictions**: Limit access to your application's IP ranges

### Data Protection

1. **Backups**: Qdrant Cloud provides automated backups
2. **Encryption**: Data is encrypted at rest and in transit
3. **Compliance**: Check Qdrant Cloud compliance certifications

## Cost Optimization

### Cluster Sizing

For 119 embeddings with binary quantization:
- **Memory usage**: ~3MB (vs 90MB without quantization)
- **Storage**: ~0.2KB per embedding
- **Recommended cluster**: Small/Developer tier should be sufficient

### Monitoring Costs

```bash
# Check current usage
curl -H "api-key: $QDRANT_API_KEY" \
     https://finca-guarumo-embeddings.qdrant.tech/collections/content_embeddings | jq '.result.points_count'

# Monitor memory usage
curl -H "api-key: $QDRANT_API_KEY" \
     https://finca-guarumo-embeddings.qdrant.telemetry/metrics
```

## Next Steps

1. **Configure environment**: Set up `.env.local` with your cloud credentials
2. **Test migration**: Run `npm run migrate:to-cloud:dry-run`
3. **Migrate data**: Run `npm run migrate:to-cloud`
4. **Validate**: Run `npm run migrate:to-cloud:validate`
5. **Deploy**: Update Netlify environment variables
6. **Monitor**: Set up alerts and monitoring

---

This cloud-first approach provides the best balance of performance, reliability, and development experience for your binary quantization implementation.
