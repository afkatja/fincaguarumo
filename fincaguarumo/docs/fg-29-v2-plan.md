# FG-29 V2 Implementation Plan: Semi-Automatic Promotion & Canary Rollouts

## Overview

V2 implements the semi-automatic promotion system with canary rollout capabilities, building on the V1.5 benchmark infrastructure. This phase enables safe, automated model promotion with comprehensive monitoring and rollback capabilities.

## Scope

### In Scope
- Semi-automatic model promotion execution
- Canary rollout system (10% → 50% → 100%)
- Automatic rollback triggers
- Enhanced monitoring during promotions
- Integration with deployment pipeline
- Promotion approval modes (recommendation-only, human-approved, auto-promote)

### Out of Scope
- Complete AI model training or fine-tuning
- Real-time model pricing optimization
- Multi-tenant model isolation
- Custom model hosting infrastructure

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Promotion Manager                             │
│  - Approval mode management                                     │
│  - Canary rollout orchestration                                │
│  - Rollback trigger monitoring                                 │
│  - Promotion state persistence                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Canary Traffic Router                           │
│  - Traffic splitting (10%/50%/100%)                           │
│  - Real-time metrics collection                                │
│  - Health check integration                                   │
│  - Fallback to incumbent model                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Rollback Trigger Engine                         │
│  - Faithfulness regression monitoring                          │
│  - Structured output validity tracking                         │
│  - Latency SLA enforcement                                     │
│  - Error rate monitoring                                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Model Gateway (Enhanced)                        │
│  - Canary-aware routing                                        │
│  - Promotion state awareness                                   │
│  - Enhanced metrics collection                                 │
│  - Rollback integration                                       │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Components

### 1. Promotion Manager (`src/lib/promotion-manager.ts`)

**Core Interfaces:**
```typescript
interface PromotionConfig {
  role: string
  candidateModel: string
  incumbentModel: string
  approvalMode: "recommendation-only" | "human-approved" | "auto-promote-non-prod"
  canaryConfig: {
    initialTraffic: number // Default: 10%
    intermediateTraffic: number // Default: 50%
    initialDuration: number // Default: 2 hours
    intermediateDuration: number // Default: 4 hours
  }
  rollbackThresholds: {
    faithfulnessRegression: number // Default: 2%
    structuredOutputValidity: number // Default: 95%
    latencySLAViolation: number // Default: 20%
    errorRate: number // Default: 5%
  }
}

interface PromotionState {
  id: string
  role: string
  candidateModel: string
  incumbentModel: string
  status: "pending" | "canary-initial" | "canary-intermediate" | "full-traffic" | "rolled-back" | "completed"
  startTime: Date
  currentPhase: "initial" | "intermediate" | "full"
  trafficPercentage: number
  metrics: PromotionMetrics
  rollbackReason?: string
}
```

**Key Functions:**
- `executePromotion(config: PromotionConfig): Promise<PromotionState>`
- `monitorPromotion(promotionId: string): Promise<PromotionMetrics>`
- `rollbackPromotion(promotionId: string, reason: string): Promise<void>`
- `getPromotionHistory(role: string): PromotionState[]`

### 2. Canary Traffic Router (`src/lib/canary-router.ts`)

**Traffic Splitting Logic:**
```typescript
interface CanaryRoutingResult {
  selectedModel: string
  isCanary: boolean
  trafficPercentage: number
  promotionId?: string
}

function routeWithCanary(
  role: string,
  request: GatewayRequest,
  promotionState?: PromotionState
): CanaryRoutingResult
```

**Implementation:**
- Hash-based traffic splitting for consistent routing
- Real-time traffic percentage adjustment
- Fallback to incumbent on canary failures
- Integration with existing model gateway

### 3. Rollback Trigger Engine (`src/lib/rollback-triggers.ts`)

**Trigger Conditions:**
```typescript
interface RollbackTrigger {
  type: "faithfulness-regression" | "structured-output-invalidity" | "latency-sla" | "error-rate" | "circuit-breaker"
  threshold: number
  windowMinutes: number
  currentValue: number
  triggeredAt: Date
}

function evaluateRollbackTriggers(
  promotionState: PromotionState,
  metrics: PromotionMetrics
): RollbackTrigger[]
```

**Monitoring Logic:**
- Faithfulness regression > 2% over 30-minute window
- Structured output validity drops below 95%
- p95 latency exceeds SLA by >20% for 15 minutes
- Error rate > 5% for 10 minutes
- Circuit breaker triggers on promoted model within first hour

### 4. Enhanced Model Gateway Integration

**Gateway Enhancements:**
- Canary-aware model selection
- Promotion state persistence
- Enhanced metrics collection for canary monitoring
- Rollback integration points

**New Gateway Functions:**
- `executeWithCanary(request: GatewayRequest, promotionState?: PromotionState)`
- `recordCanaryMetrics(promotionId: string, metrics: CanaryMetrics)`
- `handleRollback(promotionId: string, reason: string)`

## Implementation Steps

### Step 1: Promotion Manager Foundation (Week 1-2)
1. Create `src/lib/promotion-manager.ts` with basic promotion state management
2. Implement approval mode logic
3. Add promotion state persistence
4. Create basic canary configuration handling

### Step 2: Canary Traffic Router (Week 3-4)
1. Implement hash-based traffic splitting
2. Add real-time traffic percentage adjustment
3. Integrate with existing model gateway
4. Add canary failure fallback logic

### Step 3: Rollback Trigger Engine (Week 5-6)
1. Implement rollback trigger monitoring
2. Add real-time metrics evaluation
3. Create rollback execution logic
4. Integrate with health checker circuit breaker

### Step 4: Gateway Integration (Week 7-8)
1. Enhance model gateway for canary awareness
2. Add promotion state tracking
3. Implement enhanced metrics collection
4. Add rollback integration points

### Step 5: Monitoring & Dashboard (Week 9-10)
1. Create promotion monitoring dashboard
2. Add real-time canary metrics visualization
3. Implement rollback alerting
4. Create promotion history reports

## Canary Rollout Process

### Phase 1: Initial Canary (10% traffic)
```typescript
const initialPhase = {
  trafficPercentage: 10,
  duration: 2 * 60 * 60 * 1000, // 2 hours
  monitoringInterval: 30 * 1000, // 30 seconds
  rollbackTriggers: ROLLBACK_THRESHOLDS
}
```

**Monitoring Focus:**
- Basic functionality validation
- Error rate monitoring
- Latency baseline establishment
- Circuit breaker stability

### Phase 2: Intermediate Canary (50% traffic)
```typescript
const intermediatePhase = {
  trafficPercentage: 50,
  duration: 4 * 60 * 60 * 1000, // 4 hours
  monitoringInterval: 60 * 1000, // 1 minute
  rollbackTriggers: ROLLBACK_THRESHOLDS
}
```

**Monitoring Focus:**
- Faithfulness regression detection
- Structured output validity
- Performance under load
- Cost efficiency validation

### Phase 3: Full Traffic (100%)
```typescript
const fullTrafficPhase = {
  trafficPercentage: 100,
  duration: 24 * 60 * 60 * 1000, // 24 hours monitoring
  monitoringInterval: 5 * 60 * 1000, // 5 minutes
  rollbackTriggers: ROLLBACK_THRESHOLDS
}
```

**Monitoring Focus:**
- Long-term stability
- Full load performance
- Cost optimization validation
- User experience metrics

## Rollback Process

### Automatic Rollback Triggers
1. **Immediate Rollback**: Circuit breaker activation on promoted model
2. **Fast Rollback**: Error rate > 10% for 5 minutes
3. **Standard Rollback**: Any rollback trigger threshold exceeded
4. **Manual Rollback**: Admin intervention via dashboard

### Rollback Execution
```typescript
async function executeRollback(promotionId: string, reason: string): Promise<void> {
  // 1. Update promotion state to "rolled-back"
  await updatePromotionState(promotionId, { 
    status: "rolled-back", 
    rollbackReason: reason,
    endTime: new Date()
  })
  
  // 2. Switch all traffic back to incumbent model
  await switchTrafficToIncumbent(promotionId)
  
  // 3. Generate incident report
  await generateIncidentReport(promotionId, reason)
  
  // 4. Send rollback notification
  await sendRollbackNotification(promotionId, reason)
}
```

## Approval Modes Implementation

### Recommendation-Only Mode
- Generate promotion recommendations only
- Require manual approval for any changes
- No automatic traffic switching

### Human-Approved Mode
- Automatic approval for non-production environments
- Manual approval required for production
- Automated canary execution after approval

### Auto-Promote Non-Prod Mode
- Full automatic promotion in development/staging
- Manual approval still required for production
- Complete automation for testing environments

## Integration with Deployment Pipeline

### Pre-Deployment Checks
1. Verify benchmark results meet promotion criteria
2. Validate canary configuration
3. Check approval mode settings
4. Confirm rollback trigger thresholds

### Deployment Integration
```yaml
# Example CI/CD pipeline integration
promote-model:
  - name: Check promotion eligibility
    run: node scripts/check-promotion-eligibility.js
  - name: Get approval (if required)
    run: node scripts/request-promotion-approval.js
  - name: Execute canary promotion
    run: node scripts/execute-canary-promotion.js
  - name: Monitor canary
    run: node scripts/monitor-canary-promotion.js
```

### Post-Deployment
1. Monitor promotion progress
2. Handle rollback triggers
3. Update documentation
4. Archive promotion results

## Testing Strategy

### Unit Tests
- Promotion state management
- Canary traffic splitting logic
- Rollback trigger evaluation
- Approval mode logic

### Integration Tests
- End-to-end canary rollout
- Rollback trigger execution
- Gateway integration
- Dashboard functionality

### Load Tests
- Traffic splitting under load
- Canary performance impact
- Rollback execution speed
- Concurrent promotions

### Chaos Tests
- Simulated rollback triggers
- Network failures during canary
- Circuit breaker interactions
- Partial system failures

## Monitoring & Observability

### Key Metrics
- Promotion success/failure rate
- Canary phase durations
- Rollback frequency and reasons
- Traffic distribution accuracy
- User experience impact

### Alerting
- Promotion failures
- Rollback triggers
- Canary health issues
- Approval request timeouts

### Dashboard Components
- Real-time canary status
- Traffic distribution visualization
- Performance metrics comparison
- Rollback history and analysis

## Security Considerations

- Promotion authorization and access control
- Audit logging for all promotion actions
- Secure storage of promotion state
- Validation of promotion requests
- Rate limiting for promotion operations

## Success Criteria

- 95% of promotions complete without rollback
- Rollback execution within 30 seconds of trigger
- Canary traffic splitting accuracy within ±2%
- Zero downtime during promotions
- Complete audit trail for all promotions
- Integration with existing deployment pipeline

## Migration Path from V1.5

1. **Data Migration**: Migrate benchmark results to promotion database
2. **API Compatibility**: Maintain V1.5 benchmark API while adding promotion features
3. **Gradual Rollout**: Start with recommendation-only mode
4. **Backward Compatibility**: Ensure existing systems continue to work
5. **Documentation**: Update deployment guides and runbooks

## Future Enhancements

- A/B testing framework integration
- Multi-region canary support
- Advanced rollback strategies (gradual rollback)
- Machine learning-based promotion predictions
- Integration with external monitoring systems
