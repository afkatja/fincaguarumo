# Redis Rate Limiting Configuration

This document outlines the environment variables needed for Redis-based distributed rate limiting implementation.

## Environment Variables

Add the following environment variables to your `.env` file for Redis rate limiting:

### Primary Configuration

```bash
# Redis Connection URL (preferred method)
REDIS_URL=redis://username:password@hostname:port

# Alternative: Separate Redis configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```

### Deployment Options

#### Local Development

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD= # Optional for local Redis without auth
```

#### Upstash Redis (Serverless)

```bash
REDIS_URL=https://your-upstash-redis-url.upstash.io
REDIS_PASSWORD=your-upstash-password
```

#### Redis Cloud

```bash
REDIS_URL=redis://username:password@hostname:port
```

#### AWS ElastiCache

```bash
REDIS_HOST=your-elasticache-cluster.xxxxxx.0001.use1.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=your-elasticache-password
```

#### Railway Redis

```bash
REDIS_URL=redis://default:password@host:port
```

## Redis Cloud Setup Guide

Follow these steps to set up Redis Cloud for production rate limiting:

### 1. Create a Redis Cloud Account

1. Visit [Redis Cloud](https://redis.com/try-free/)
2. Sign up for a free account or log in with existing credentials
3. Choose your preferred cloud provider (AWS, GCP, or Azure)

### 2. Create a Redis Database

1. Navigate to the Redis Cloud console
2. Click **"Create Database"** or **"Get Started"**
3. Select **"Redis"** as the database type
4. Choose your configuration:
   - **Subscription**: Free tier (30MB) or paid tier
   - **Region**: Select the region closest to your application servers
   - **Redis version**: Use the latest stable version
   - **Module**: No additional modules needed for basic rate limiting

### 3. Configure Database Settings

1. **Database Name**: Enter a descriptive name (e.g., `fincaguarumo-rate-limit`)
2. **Memory Size**:
   - Free tier: 30MB (sufficient for small applications)
   - Production: Start with 256MB or 512MB
3. **Replication**: Enable replication for high availability (recommended for production)
4. **Persistence**: Enable backup for data durability

### 4. Security Configuration

1. **Authentication**: Redis Cloud automatically generates a password
2. **TLS/SSL**: Ensure TLS is enabled (default in Redis Cloud)
3. **IP Allowlist**: Add your application's IP addresses or use Redis Cloud's fixed endpoints
4. **Private Endpoint**: For enhanced security, consider using VPC peering

### 5. Get Connection Details

1. After database creation, navigate to your database details
2. Click **"Connect"** to view connection information
3. Copy the **Connection String** (Redis URL format)
4. Note the **Password** if not included in the connection string

### 6. Configure Environment Variables

Add the Redis Cloud connection details to your `.env` file:

```bash
# Redis Cloud Connection
REDIS_URL=redis://default:your_password@your-redis-cloud-host:port

# Alternative: Separate configuration
REDIS_HOST=your-redis-cloud-host
REDIS_PORT=port
REDIS_PASSWORD=your_password
```

### 7. Test the Connection

Verify your Redis Cloud connection:

```bash
# Using redis-cli
redis-cli -u $REDIS_URL ping

# Expected response: PONG
```

Or test within your application:

```typescript
import { embeddingsRateLimiter } from "@/lib/rate-limiting/redis-rate-limit"

// Test Redis connection
const isHealthy = await embeddingsRateLimiter.isHealthy()
console.log("Redis Cloud connection:", isHealthy ? "Healthy" : "Unhealthy")
```

### 8. Monitor and Scale

1. **Monitoring**: Use Redis Cloud's built-in metrics dashboard
2. **Alerts**: Set up alerts for:
   - Memory usage > 80%
   - Connection failures
   - High latency
3. **Scaling**: Upgrade your subscription as traffic grows

### 9. Production Best Practices

- **Connection Pooling**: The rate limiter handles connection pooling automatically
- **Retry Logic**: Built-in retry mechanisms for failed connections
- **Fail-Open**: Rate limiting allows requests if Redis is unavailable
- **Backup**: Enable automatic backups in Redis Cloud settings
- **Logging**: Monitor rate limiting effectiveness through application logs

### 10. Cost Optimization

- **Free Tier**: Perfect for development and small applications
- **Memory Management**: Monitor key expiration to prevent memory bloat
- **Tier Selection**: Start with the smallest paid tier and scale as needed
- **Region Selection**: Choose regions closest to your users to reduce latency

## Security Considerations

1. **Use TLS/SSL**: Always use Redis connections with TLS in production
2. **Authentication**: Enable Redis AUTH with strong passwords
3. **Network Security**: Use VPC peering or private endpoints
4. **Environment Variables**: Never commit Redis credentials to version control

## Rate Limiting Configuration

The rate limiting is configured with these defaults:

- **Embeddings API**: 50 requests per minute
- **Contact API**: 10 requests per minute
- **Bookings API**: 30 requests per minute

These can be customized by modifying the rate limiter instances in `src/lib/rate-limiting/redis-rate-limit.ts`.

## Monitoring and Health Checks

The Redis rate limiter includes health check functionality:

```typescript
import { embeddingsRateLimiter } from "@/lib/rate-limiting/redis-rate-limit"

// Check Redis connection health
const isHealthy = await embeddingsRateLimiter.isHealthy()
```

## Fail-Open Behavior

The rate limiting system is designed to **fail open** - if Redis is unavailable, requests will be allowed to prevent application downtime. This ensures that rate limiting failures don't break the core application functionality.

## Testing

To test the rate limiting locally:

1. Start a local Redis instance: `redis-server`
2. Set environment variables for local Redis
3. Make repeated API calls to test rate limiting behavior

## Migration from In-Memory Rate Limiting

The previous in-memory rate limiting had these vulnerabilities:

- Reset on server restart
- No distributed synchronization
- IP rotation bypass
- Memory exhaustion risks

The Redis implementation addresses all these issues with:

- Persistent storage across restarts
- Distributed synchronization
- Atomic operations preventing race conditions
- Automatic cleanup with TTL
- Configurable memory management
