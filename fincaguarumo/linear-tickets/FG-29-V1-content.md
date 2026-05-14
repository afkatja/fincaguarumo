# Linear Ticket Content: FG-29-V1

## Title
FG-29-V1: Implement Role-Based Model Provider System - Phase 1

## Description
Phase 1 implementation of the role-based AI model provider system. This phase fixes the current hardcoded model provider bug and establishes the foundational role-based configuration system with backward compatibility.

## Acceptance Criteria

### Core Functionality
- [ ] Fix provider bug: `model-provider-factory.ts` no longer hardcodes Mistral regardless of environment config
- [ ] Implement role-based configuration using canonical naming convention:
  - GEN_MODEL_PRIMARY_PROVIDER, GEN_MODEL_PRIMARY_MODEL_ID, GEN_MODEL_PRIMARY_FALLBACKS
  - GEN_MODEL_TOOLS_PROVIDER, GEN_MODEL_TOOLS_MODEL_ID, GEN_MODEL_TOOLS_FALLBACKS  
  - GEN_MODEL_FAST_PROVIDER, GEN_MODEL_FAST_MODEL_ID, GEN_MODEL_FAST_FALLBACKS
  - EVAL_MODEL_PROVIDER, EVAL_MODEL_MODEL_ID, EVAL_MODEL_FALLBACKS
  - EMBED_MODEL_LOCAL_PROVIDER, EMBED_MODEL_LOCAL_MODEL_ID, EMBED_MODEL_LOCAL_FALLBACKS
  - EMBED_MODEL_REMOTE_PROVIDER, EMBED_MODEL_REMOTE_MODEL_ID, EMBED_MODEL_REMOTE_FALLBACKS
- [ ] Add backward-compatible alias layer for existing MAIN_MODEL_PROVIDER, MAIN_MODEL_ID variables
- [ ] Implement model provider registry with declared capabilities
- [ ] Create rule-based task router for automatic model selection (v1)
- [ ] Implement health checking and automatic fallback chains with explicit failure triggers
- [ ] Add manual override capabilities via environment variables

### Technical Requirements
- [ ] Model selection latency < 50ms
- [ ] Fallback timeout < 5 seconds
- [ ] Circuit breaker implementation with configurable thresholds
- [ ] Comprehensive logging of model selection, fallback, and performance metrics
- [ ] Graceful degradation when models fail with consistent response format

### Error Handling
- [ ] Model unavailable: Automatic fallback to next model in chain (timeout, 429, 5xx, malformed structured output, tool-call invalidity)
- [ ] All models failed: Return typed graceful degradation response
- [ ] Invalid configuration: Log error and use safe defaults

### Testing
- [ ] Unit tests for model provider registry
- [ ] Integration tests for fallback chains
- [ ] End-to-end tests for role-based routing
- [ ] Performance tests for latency requirements

## Dependencies
- FG-29 parent ticket
- Current embedding system configuration

## Notes
- This phase establishes the foundation for subsequent benchmarking and automatic promotion features
- Focus on stability and backward compatibility
- All model versions shall be pinned to prevent silent behavior changes
