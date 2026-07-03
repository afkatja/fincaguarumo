# Architecture Notes: FG-29 Role-Based Model Provider System

## Overview

This document captures architectural decisions and design patterns for the role-based AI model provider system, which replaces the current hardcoded model configuration with a flexible, environment-aware, role-based routing system.

## System Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     Application Layer                            │
│  (Chatbot, Booking, RAG, Evaluation, Tools)                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Model Gateway                                 │
│  src/lib/model-gateway.ts                                        │
│  - execute(role, request) - single entry point                   │
│  - Role → adapter + modelRef resolution                          │
│  - Circuit breaker checking                                       │
│  - Environment selection (local vs remote)                       │
│  - Auth resolution (reads API keys, passes to adapters)          │
│  - Fallback chain iteration                                      │
│  - Timeout policy enforcement                                     │
│  - Metrics recording                                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Model        │ │ Health       │ │ Model        │
│ Registry     │ │ Checker      │ │ Provider    │
│              │ │              │ │ Factory     │
│ (config)     │ │ (circuit     │ │ (legacy,    │
│              │ │ breaker)     │ │ being       │
│              │ │              │ │ phased out) │
└──────────────┘ └──────────────┘ └──────────────┘
         │               │               │
         └───────────────┼───────────────┘
                         ▼
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Provider A  │ │  Provider B  │ │  Provider C  │
│  (Together)  │ │  (Ollama)    │ │  (OpenAI)    │
└──────────────┘ └──────────────┘ └──────────────┘
```

### Component Responsibilities

#### 1. Model Gateway (`src/lib/model-gateway.ts`)

- **Responsibility**: Central entry point for all LLM calls, consolidates routing, health checking, fallback, auth, and environment selection
- **Key Function**:
  - `execute(role, request)`: Single callable entry point that handles the full execute contract
- **Execute Contract**:
  1. Resolve role → adapter + modelRef via registry
  2. Check circuit breaker before sending
  3. Select adapter (local Ollama in dev, remote in production) based on NEXT_PUBLIC_NETLIFY_ENV
  4. Resolve auth — look up the right API key for the resolved adapter
  5. Send request with timeout
  6. On failure: log, update circuit breaker, advance fallback chain, retry with next model
  7. Return typed result including which model was actually used and latency
  8. Record metrics for health and promotion decisions
- **Design Pattern**: Facade pattern - provides simplified interface to complex subsystem
- **Migration Note**: Consolidates logic previously spread across `model-provider-factory.ts`, `health-checker.ts`, and `task-router.ts`

#### 2. Model Registry

- **Responsibility**: Provider capability declaration and validation
- **Data Structure**: Registry of providers with declared capabilities
- **Key Fields**:
  - `providerId`: Unique identifier
  - `supportedRoles`: Array of roles (generation, tools, evaluation, embeddings)
  - `capabilities`: Multilingual, tool-calling, structured output
  - `smokeTestEndpoint`: Optional health check endpoint
  - `embeddingFamily`: For embedding compatibility validation

#### 3. Health Checker (`src/lib/health-checker.ts`)

- **Responsibility**: Provider health monitoring and circuit breaker management
- **Key Functions**:
  - `checkProviderHealth(providerId)`: Returns health status
  - `isProviderAvailable(providerId)`: Checks circuit breaker state
  - `recordFailure(providerId)`: Updates circuit breaker metrics
- **Circuit Breaker Logic**:
  - Trigger: 3 consecutive failures in 5 minutes OR 50% failure rate over 20 requests
  - Disable duration: 15min (first), 30min (second), 60min (subsequent)
  - Recovery: Low-volume test traffic before full reintegration
- **Usage**: Called by gateway, not directly by application code

#### 4. Model Provider Factory (`src/lib/model-provider-factory.ts`)

- **Responsibility**: Legacy provider instantiation (being phased out)
- **Status**: Logic being migrated to gateway; will become internal utility
- **Key Functions**:
  - `createModelProvider(role)`: Creates provider instance (used internally by gateway)
  - `createModelProviderWithFallback(role)`: Fallback-aware creation (used internally by gateway)
- **Migration Path**: Fallback iteration and retry logic moved to gateway; factory becomes simple instantiation helper

#### 5. Task Router (`src/lib/task-router.ts`)

- **Responsibility**: Task-to-role mapping (used by gateway for role resolution)
- **Status**: Environment selection logic moved to gateway; retains routing logic
- **Key Functions**:
  - `routeRequest(request)`: Maps task type to role
  - `shouldUseLocalEmbedding()`: Environment selection (moved to gateway)
- **Migration Path**: Gateway calls router for role resolution, but handles environment selection internally

#### 6. Benchmark Harness (V1.5)

- **Responsibility**: Model performance evaluation and comparison
- **Location**: `scripts/benchmark-models.ts`
- **Key Functions**:
  - `runBenchmark(modelId, role, dataset)`: Executes benchmark
  - `compareModels(candidateId, incumbentId)`: Generates comparison report
  - `generatePromotionRecommendation()`: Suggests model changes
- **Storage**: `./benchmarks/results/` with timestamped subdirectories

#### 7. Promotion System (V2)

- **Responsibility**: Semi-automatic model promotion with safety guards
- **Key Functions**:
  - `evaluatePromotion(candidateId, incumbentId)`: Checks promotion criteria
  - `executePromotion(role, newModelId)`: Performs promotion with canary
  - `rollbackPromotion(role)`: Reverts to previous model
- **Safety Guards**:
  - 5% weighted score improvement minimum
  - Faithfulness regression ≤1%
  - Structured output validity ≥98%
  - p95 latency within SLA
  - Canary rollout: 10% → 50% → 100%

## Configuration Strategy

### Canonical Naming Convention

Environment variables follow the pattern: `{ROLE}_{ATTRIBUTE}`

**Generation Roles**:

- `GEN_MODEL_PRIMARY_PROVIDER`, `GEN_MODEL_PRIMARY_MODEL_ID`, `GEN_MODEL_PRIMARY_FALLBACKS`
- `GEN_MODEL_TOOLS_PROVIDER`, `GEN_MODEL_TOOLS_MODEL_ID`, `GEN_MODEL_TOOLS_FALLBACKS`
- `GEN_MODEL_FAST_PROVIDER`, `GEN_MODEL_FAST_MODEL_ID`, `GEN_MODEL_FAST_FALLBACKS`

**Evaluation Role**:

- `EVAL_MODEL_PROVIDER`, `EVAL_MODEL_MODEL_ID`, `EVAL_MODEL_FALLBACKS`

**Embedding Roles**:

- `EMBED_MODEL_LOCAL_PROVIDER`, `EMBED_MODEL_LOCAL_MODEL_ID`, `EMBED_MODEL_LOCAL_FALLBACKS`
- `EMBED_MODEL_REMOTE_PROVIDER`, `EMBED_MODEL_REMOTE_MODEL_ID`, `EMBED_MODEL_REMOTE_FALLBACKS`

**Backward Compatibility**:

- `MAIN_MODEL_PROVIDER`, `MAIN_MODEL_ID` map to `GEN_MODEL_PRIMARY_*`
- `EMBEDDING_MODEL_PROVIDER`, `EMBEDDING_MODEL_ID` map to `EMBED_MODEL_REMOTE_*`

### Fallback Chain Format

```
GEN_MODEL_PRIMARY_FALLBACKS=provider-a:model-x,provider-b:model-y,provider-c:model-z
```

- Ordered array of provider:model tuples
- Attempted in exact order specified
- Each attempt logged with timestamp and failure reason

### Manual Override

```
GEN_MODEL_PRIMARY_OVERRIDE_PROVIDER=provider-a
GEN_MODEL_PRIMARY_OVERRIDE_MODEL_ID=model-x
```

- Scope: Runtime production traffic for specified role only
- Does not affect: Benchmark runs, evaluation routes, tools routes
- Use case: Emergency fixes, A/B testing

## Data Flow

### Request Routing Flow

```
1. Application Request
   ↓
2. Extract Task Role (generation, tools, evaluation, embedding)
   ↓
3. Check Manual Override
   ├─ Yes → Use override model
   └─ No  → Continue
   ↓
4. Get Primary Model from Config
   ↓
5. Check Circuit Breaker Status
   ├─ Open → Try next in fallback chain
   └─ Closed → Continue
   ↓
6. Check Health Cache (TTL: 5min)
   ├─ Valid → Use cached status
   └─ Expired → Refresh health check
   ↓
7. Execute Request
   ├─ Success → Return result, log metrics
   └─ Failure → Record failure, trigger circuit breaker, try next fallback
   ↓
8. All Models Failed
   → Return graceful degradation response
```

### Benchmark Flow (V1.5)

```
1. Trigger (nightly/weekly/ad-hoc)
   ↓
2. Load Golden Set (internal + public benchmarks)
   ↓
3. For each candidate model:
   ├─ Run smoke tests
   ├─ Execute benchmark suite
   ├─ Calculate weighted score
   └─ Compare with incumbent
   ↓
4. Generate Promotion Recommendation
   ├─ Meets criteria → Recommend for promotion
   └─ Fails criteria → Log reasons, keep incumbent
   ↓
5. Store Results
   → ./benchmarks/results/{timestamp}/
```

### Promotion Flow (V2)

```
1. Promotion Recommendation Available
   ↓
2. Check Approval Mode
   ├─ Recommendation-only → Require manual approval
   ├─ Human-approved → Auto non-prod, manual prod
   └─ Auto-promote non-prod → Auto in dev/staging, manual in prod
   ↓
3. Execute Canary Rollout
   ├─ 10% traffic for 2 hours
   ├─ Monitor metrics (faithfulness, latency, error rate)
   ├─ 50% traffic for 4 hours
   └─ 100% traffic if metrics stable
   ↓
4. Rollback Triggered?
   ├─ Yes → Immediate rollback, incident report
   └─ No → Promotion complete
```

## Fallback and Circuit Breaker Design

### Failure Triggers

Explicit failure conditions that trigger fallback:

- Timeout (>5 seconds)
- HTTP 429 (rate limit)
- HTTP 5xx (server error)
- Malformed structured output
- Invalid tool call format
- Circuit breaker open

### Circuit Breaker State Machine

```
┌──────────┐
│  CLOSED  │ ← Normal operation
└────┬─────┘
     │ 3 failures in 5min
     │ OR 50% failure rate
     ▼
┌──────────┐
│   OPEN   │ ← Rejecting requests
└────┬─────┘
     │ Disable duration expires
     ▼
┌──────────┐
│ HALF_OPEN│ ← Test traffic
└────┬─────┘
     │ Test successful
     ▼
┌──────────┐
│  CLOSED  │
└──────────┘
```

### Health Check TTL Strategy

- **Stable models**: Cache for 5 minutes
- **Recently recovered**: Cache for 2 minutes
- **Force refresh**: After circuit breaker event or manual promotion
- **Background refresh**: Every 10 minutes regardless of cache

## Benchmarking Architecture

### Multilingual RAG Benchmark Matrix

| Dimension                     | Test Cases                        | Metric                       | Pass Threshold        |
| ----------------------------- | --------------------------------- | ---------------------------- | --------------------- |
| Query language handling       | ES, EN, NL, mixed-language        | Task success rate            | ≥90%                  |
| Retrieval relevance           | Top-k retrieval                   | Recall@5, MRR, nDCG@10       | Recall@5 ≥0.85        |
| Cross-lingual retrieval       | ES→EN, EN→ES, NL→EN               | Recall@5                     | ≥0.75                 |
| Grounded answer accuracy      | Curated context sets              | Rubric score                 | ≥4/5                  |
| Faithfulness                  | Unanswerable, conflicting context | Hallucination rate           | ≤5%                   |
| Citation quality              | Multi-claim answers               | Citation precision           | ≥0.9                  |
| Structured output reliability | JSON, tool args                   | Valid JSON rate              | ≥98%                  |
| Tool-calling robustness       | Tool selection                    | Tool success rate            | ≥95%                  |
| Latency                       | Benchmark set                     | p50, p95 ms                  | p95 within SLA        |
| Cost efficiency               | Same benchmark set                | Cost per task                | Better than incumbent |
| Failure recovery              | Simulated outages                 | Recovery rate, failover time | Recovery ≥95%, <5s    |
| Language style quality        | Native-speaker rubric             | Human rubric score           | ≥4/5 each language    |

### Promotion Scoring Formula

**Weights for Multilingual RAG**:

- Retrieval relevance: 20%
- Cross-lingual retrieval: 15%
- Grounded answer accuracy: 20%
- Faithfulness: 20%
- Structured output/tool reliability: 10%
- Latency: 10%
- Cost efficiency: 5%

**Promotion Requirements**:

- Total weighted score beats incumbent by ≥5%
- Faithfulness regression ≤1%
- Structured output validity ≥98%
- p95 latency within SLA
- Failure recovery <5 seconds
- Confirmed in 2 consecutive benchmark runs

### Dataset Strategy

1. **Internal Golden Set**: Domain-specific hospitality/tourism content (highest priority)
2. **Public Benchmarks**:
   - MIRACL: Core multilingual retrieval
   - MMTEB: Broad embedding evaluation
   - MLDR: Long-document multilingual retrieval
   - MEMERAG: End-to-end multilingual RAG quality
   - BEIR: English zero-shot robustness baseline
3. **Mixed Evaluation**: Combine internal tests with public benchmarks

## Security Considerations

### API Key Management

- Provider API keys stored in environment variables
- Never log credentials or expose in error messages
- Use separate keys for development and production
- Rotate keys regularly via provider dashboards

### Input Validation

- Validate all model inputs before sending to providers
- Sanitize user prompts to prevent injection attacks
- Validate structured output schemas before use
- Rate limit requests per provider to prevent abuse

### Audit Logging

- Log all model selection decisions
- Log all fallback attempts with reasons
- Log all promotion decisions with justification
- Retain logs for 90 days for incident analysis

## Performance Considerations

### Latency Budget

- Model selection: <50ms
- Fallback timeout: <5 seconds
- p95 latency: Within product SLA
- Health check cache: 5 minutes (stable), 2 minutes (recovered)

### Caching Strategy

- Health status cached with TTL
- Benchmark results cached for 24 hours
- Model responses cached where appropriate (with invalidation)
- Embedding vectors cached in Qdrant

### Resource Management

- Connection pooling for provider APIs
- Request queuing for rate-limited providers
- Exponential backoff for retries
- Circuit breaker to prevent cascading failures

## Implementation Phases

### Phase V1 (Current)

- Fix hardcoded provider bug in `model-provider-factory.ts`
- Add role-based configuration with canonical naming
- Implement backward-compatible alias layer
- Create model provider registry with capability declaration
- Implement rule-based task router
- Add explicit fallback chains
- Add manual override capability
- Implement health checking and circuit breaker
- Add graceful degradation response

### Phase V1.5

- Implement benchmark harness
- Add nightly smoke checks
- Add weekly benchmark jobs
- Generate promotion recommendations
- Implement benchmark result storage
- Add regression detection

### Phase V2

- Implement semi-automatic promotion
- Add canary rollout system
- Implement rollback triggers
- Add richer capability verification
- Optional learned routing/classification

## Migration Strategy

### Backward Compatibility

- Existing `MAIN_MODEL_*` variables map to `GEN_MODEL_PRIMARY_*`
- Existing `EMBEDDING_MODEL_*` variables map to `EMBED_MODEL_REMOTE_*`
- No breaking changes to existing API contracts
- Gradual migration path for configuration

### Version Pinning

- Use pinned model versions only (no "latest" aliases)
- Treat each version change as new candidate
- Require compatibility tests before promotion
- Keep previous version available for rollback (one release cycle)

### Embedding Migration

- Require retrieval parity validation before promotion
- A/B testing with 50/50 traffic split for 24 hours
- Previous model available for rollback (minimum 7 days)
- Validate embedding family compatibility (not just dimensionality)

## Error Handling

### Graceful Degradation Response Types

- **No answer available**: When no model can respond
- **Partial answer**: When models return incomplete results
- **Stale cached answer**: When models unavailable but cache exists
- **Fallback-generated minimal response**: When models fail but basic response possible

### Error States

- **Model unavailable**: Automatic fallback to next in chain
- **All models failed**: Return graceful degradation response
- **Invalid configuration**: Log error, use safe defaults
- **Benchmark failure**: Skip promotion, log for manual review

## Testing Strategy

### Unit Tests

- Provider selection logic
- Fallback chain resolution
- Circuit breaker state transitions
- Configuration parsing and validation
- Graceful degradation response generation

### Integration Tests

- End-to-end request routing
- Health check integration
- Fallback behavior under simulated failures
- Configuration override functionality

### Benchmark Tests

- Smoke test execution
- Benchmark result calculation
- Promotion criteria evaluation
- Regression detection

### E2E Tests

- Full request lifecycle with fallbacks
- Manual override scenarios
- Canary rollout simulation
- Rollback trigger testing

## Monitoring and Observability

### Metrics to Track

- Model selection latency
- Fallback rate per provider
- Circuit breaker triggers
- Benchmark scores over time
- Promotion success/failure rate
- Error rate per role and provider
- Latency percentiles per model

### Alerting

- Circuit breaker triggers
- High fallback rates (>20%)
- Benchmark regression (>2%)
- Promotion failures
- Health check failures

### Dashboards

- Model performance overview
- Fallback chain status
- Benchmark trends
- Promotion history
- Health check status

## References

- Feature Spec: `./feature-specs/FG-29-role-based-model-provider.md`
- Implementation: `src/lib/model-provider-factory.ts`
- Health Checker: `src/lib/health-checker.ts`
- Degradation Response: `src/lib/degradation-response.ts`
- Tests: `tests/model-provider.test.ts`, `tests/degradation-response.test.ts`
