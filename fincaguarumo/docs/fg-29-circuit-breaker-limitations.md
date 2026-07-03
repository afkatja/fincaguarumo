# FG-29 Circuit Breaker Limitations

## Current Implementation

The FG-29 role-based model provider system implements circuit breaker functionality in `src/lib/health-checker.ts`. This document outlines the current limitations and future considerations.

## In-Memory State Limitation

**Current Behavior:**
- Circuit breaker states are stored in-memory using `Map<string, CircuitBreakerState>`
- States reset to defaults when the application process restarts
- Health check cache also resets on restart

**Impact:**
- After deployment, circuit breakers start in "closed" state regardless of previous failures
- Recent failure history is lost during restarts
- Background refresh interval resets

**Acceptable for V1:**
- This limitation is acceptable for the V1 implementation
- Circuit breakers will re-trip quickly if the underlying issue persists
- Progressive disable duration (15/30/60 min) will re-apply as failures recur

## Future Improvements (V1.5/V2)

Consider implementing persistent circuit breaker state:

1. **Database Persistence**: Store circuit breaker states in the application database
2. **Redis Cache**: Use Redis for distributed circuit breaker state across multiple instances
3. **File-based Persistence**: Simple file storage for single-instance deployments

## Migration Path

When implementing persistence:
1. Add configuration flag to enable/disable persistence
2. Implement fallback to in-memory storage if persistence fails
3. Ensure backward compatibility with existing deployments
4. Add migration for existing in-memory state to persistent storage

## Monitoring Recommendations

Monitor circuit breaker resets during deployments:
- Track frequency of circuit breaker state resets
- Alert if circuit breakers reset to "closed" state frequently
- Consider deployment strategies that preserve circuit breaker state when possible
