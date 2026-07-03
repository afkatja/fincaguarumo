# Feature Spec: Role-Based AI Model Provider System

## 0. Architecture notes

- Notes file: ./architecture-notes/FG-29-role-based-model-provider.md

## 0.1 Gateway Architecture

The system uses a centralized **Model Gateway** (`src/lib/model-gateway.ts`) as the single entry point for all LLM calls. Callers (chatbot, RAG pipeline, evaluation, etc.) only express what they want — not how to reach a model. The gateway is responsible for the full execute contract:

- Resolve role → adapter + modelRef via registry
- Check circuit breaker before sending
- Select adapter (local Ollama in dev, remote in production) based on NEXT_PUBLIC_NETLIFY_ENV
- Resolve auth — look up the right API key for the resolved adapter
- Send request with timeout
- On failure: log, update circuit breaker, advance fallback chain, retry with next model
- Return typed result including which model was actually used and latency
- Record metrics for health and promotion decisions

The gateway consolidates logic into a single callable entry point with a unified `execute(role, request)` function.

### Tool-Calling Format Configuration

When the gateway routes requests to the tools role, it must configure the appropriate tool-calling format based on the model's requirements:

- **Hermes-style template**: For models that perform best with Hermes-style tool-calling (not bare JSON mode)
- **System prompt configuration**: Gateway sets the appropriate system prompt or tool-calling format before sending requests to the tools role
- **Model-specific handling**: Gateway reads model capabilities from registry and applies the correct format automatically

## 1. Problem & context

- Business problem: Current AI model provider system has hardcoded models, ignores environment configuration, and lacks flexibility for rapid AI landscape evolution
- Who is affected: Development team, system administrators, end users experiencing inconsistent AI responses
- Current behavior: `model-provider-factory.ts` hardcodes Mistral regardless of environment config, embedding system uses separate hardcoded models, no role-based model selection
- Desired behavior: Flexible role-based model system with automatic fallback, benchmarking, and semi-automatic model promotion based on performance metrics

## 2. User stories

- As a developer, I want to configure different AI models for specific roles (generation, tools, evaluation, embeddings) so that I can optimize for each task's requirements.
- As a system administrator, I want automatic model fallback and health checking so that the system remains available during model outages.
- As a developer, I want benchmarking and automatic model promotion so that better models can be adopted with minimal manual intervention.
- As a developer, I want local development with OSS models and production with open-source cloud models so that I can test locally while deploying reliably.

## 3. Scope & out of scope

### In scope

#### Canonical Naming Convention

- **Primary Generation**: GEN_MODEL_PRIMARY_PROVIDER, GEN_MODEL_PRIMARY_MODEL_ID, GEN_MODEL_PRIMARY_FALLBACKS
- **Tools Generation**: GEN_MODEL_TOOLS_PROVIDER, GEN_MODEL_TOOLS_MODEL_ID, GEN_MODEL_TOOLS_FALLBACKS
- **Fast Generation**: GEN_MODEL_FAST_PROVIDER, GEN_MODEL_FAST_MODEL_ID, GEN_MODEL_FAST_FALLBACKS
- **Evaluation**: EVAL_MODEL_PROVIDER, EVAL_MODEL_MODEL_ID, EVAL_MODEL_FALLBACKS
- **Embedding Local**: EMBED_MODEL_LOCAL_PROVIDER, EMBED_MODEL_LOCAL_MODEL_ID, EMBED_MODEL_LOCAL_FALLBACKS
- **Embedding Remote**: EMBED_MODEL_REMOTE_PROVIDER, EMBED_MODEL_REMOTE_MODEL_ID, EMBED_MODEL_REMOTE_FALLBACKS

#### Implementation Phases

| Phase | What belongs there                                                                                                                                                                                                        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1    | Create model gateway with execute(role, request), fix provider bug, add role-based config, backward-compatible aliases, explicit fallback chains, manual overrides, consolidate logic from factory/health-checker/router. |
| V1.5  | Benchmark harness, nightly smoke checks, weekly benchmark jobs, promotion recommendations.                                                                                                                                |
| V2    | Semi-automatic promotion, richer capability verification, optional learned routing/classification.                                                                                                                        |

- Centralized model gateway with execute(role, request) as single entry point for all LLM calls
- Role-based model configuration with provider/model separation using canonical naming above
- Backward-compatible alias layer for existing MAIN_MODEL_PROVIDER, MAIN_MODEL_ID variables
- Model provider registry with declared capabilities and optional smoke-test verification
- Gateway handles environment selection (local Ollama in dev, remote in production)
- Gateway resolves auth credentials and passes to adapters (adapters never read process.env directly)
- Gateway manages fallback chain iteration, circuit breaker checks, and timeout policy
- Health checking and automatic fallback chains with explicit failure triggers
- Comprehensive multilingual RAG benchmarking (retrieval + grounded generation)
- Semi-automatic model promotion with weighted scoring and regression guards
- Manual override capabilities for production safety
- Version pinning policy for model stability

### Out of scope

- Complete AI model training or fine-tuning
- Real-time model pricing optimization
- Multi-tenant model isolation
- Custom model hosting infrastructure

## 4. Functional requirements

- FR1: System shall route requests to appropriate models based on task role and capabilities
- FR2: System shall automatically fallback to secondary models when primary models fail
- FR3: System shall benchmark models on multilingual quality, structured output, tool-calling, latency, and cost
- FR4: System shall promote models automatically only when they beat incumbents by safe margins
- FR5: System shall support manual override via environment variables
- FR6: System shall maintain embedding compatibility across local and remote models requiring same embedding family or validated cross-provider equivalence, not just dimensional parity

### Inputs

- Task type (generation, tools, evaluation, embedding)
- Request content and context
- Performance metrics and benchmark results
- Environment configuration variables

### Outputs

- Model-selected AI responses
- Health status and fallback logs
- Benchmark reports and promotion recommendations
- Performance metrics and alerts

### Error states

- Model unavailable: Automatic fallback to next model in chain based on explicit triggers (timeout, 429, 5xx, malformed structured output, tool-call invalidity)
- All models failed: Return typed graceful degradation response (no answer, partial answer, stale cached answer, or fallback-generated minimal response)
- Invalid configuration: Log error and use safe defaults
- Benchmark failure: Skip promotion, log error for manual review

## 5. Non-functional requirements

- Performance: Model selection latency < 50ms, fallback timeout < 5 seconds, p95 latency within SLA
- Security / auth: API keys properly isolated, no credential leakage in logs
- UX / accessibility: Graceful degradation when models fail, consistent response format
- Observability: Detailed logging of model selection, fallback, and performance metrics

## 6. Data model & contracts

- Data model changes:
  - New/updated entities: ModelRole, ModelCapability, ModelProvider, BenchmarkResult, PromotionRule, GatewayRequest, GatewayResponse
- API / function contracts:
  - Endpoint or function name: execute(role, request), benchmarkModel(), promoteModel()
  - Request shape: { role: string, taskType: string, content: string, context: object, preferences?: object }
  - Response shape: { result: object, modelUsed: string, adapterKey: string, fallbackChain: string[], metrics: { latency: number, modelRef: string } }
  - Status / error codes: Standard HTTP status + model-specific error codes

### Precedence Rules

1. **Config declares capability**: Model providers declare supported capabilities (multilingual, tool-calling, evaluation, embedding family compatibility)
2. **Smoke tests verify operational support**: Automated smoke tests verify declared capabilities work in practice
3. **Benchmarks validate quality threshold**: Comprehensive benchmarks validate models meet quality thresholds for their declared roles
4. **Router only uses models with all checks passed**: The task router only uses models for a role if all required checks (capability declaration, smoke test verification, benchmark validation) pass

### Fallback Ordering Format

Fallback chains are represented as ordered arrays of provider-model tuples:

```
GEN_MODEL_PRIMARY_FALLBACKS=provider-a:model-x,provider-b:model-y,provider-c:model-z
```

The system attempts models in the exact order specified, with each fallback attempt logged with timestamp and failure reason.

### Circuit Breaker Behavior

- **Trigger conditions**: 3 consecutive failures within 5-minute window, or 50% failure rate over 20 requests
- **Disable duration**: 15 minutes for first offense, 30 minutes for second, 60 minutes for subsequent offenses
- **Recovery check**: After disable period expires, model receives low-volume test traffic before full reintegration
- **Manual override**: Circuit breaker can be manually bypassed via emergency override variable

### Health Check TTL

- **Cache duration**: Health status cached for 5 minutes for stable models, 2 minutes for recently recovered models
- **Force refresh**: Health status refreshed immediately after any circuit breaker event or manual promotion
- **Background refresh**: Health checks run in background every 10 minutes regardless of cache state

### Benchmark Result Storage

- **Storage location**: Benchmark artifacts stored in `./benchmarks/results/` with timestamped subdirectories
- **Required fields**: modelId, provider, role, timestamp, weightedScore, individualMetrics, regressionFlags, costMetrics
- **Retention policy**: Keep last 90 days of daily results, last 30 days of hourly smoke tests
- **Artifact format**: JSON for structured data, CSV for time series, optional PDF for human-readable reports

### Promotion Approval Mode

- **Recommendation-only**: System generates promotion recommendations but requires manual approval for any changes
- **Human-approved**: Automatic approval for non-production environments, manual approval required for production
- **Auto-promote in non-prod**: Automatic promotion in development/staging environments, production requires manual approval

### Canary Policy

- **Gradual rollout**: New promoted models receive 10% traffic for first 2 hours, then 50% for next 4 hours, then 100%
- **Rollback triggers**: Any regression in core metrics (faithfulness, structured output validity, latency) triggers immediate rollback
- **Monitoring**: Enhanced monitoring during canary phase with real-time alerting on metric degradation
- **Emergency bypass**: Canary policy can be bypassed via emergency override for critical fixes

### Rollback Trigger Conditions

- **Automatic rollback conditions**:
  - Faithfulness regression > 2% over 30-minute window
  - Structured output validity drops below 95% for any tool-calling role
  - p95 latency exceeds SLA by > 20% for 15 minutes
  - Error rate > 5% for any role over 10 minutes
  - Circuit breaker triggers on promoted model within first hour
- **Rollback process**: Immediate traffic redirection to previous stable model, full incident report generation

### Embedding Migration Rule

- **Retrieval parity validation**: Required before any embedding model promotion
- **Failure handling**: If retrieval parity fails, candidate embedding model is rejected regardless of other metrics
- **Gradual migration**: Embedding model changes require A/B testing with 50/50 traffic split for 24 hours before full cutover
- **Fallback preservation**: Previous embedding model remains available for rollback for minimum 7 days

## 7. Edge cases & constraints

- Model API rate limits: Implement exponential backoff and request queuing
- Mixed-language prompts: Route to multilingual-capable models
- Structured output failures: Fallback to models with better tool-calling
- Cost overruns: Automatic budget monitoring and model demotion
- Local model unavailability: Graceful fallback to cloud models
- Constraints: embedding family compatibility validation per FR6, multilingual support (es, en, nl, ru, de), production stability requirements

## 8. Acceptance criteria

- A1: Given environment variables GEN_MODEL_PRIMARY_PROVIDER=provider-a, GEN_MODEL_PRIMARY_MODEL_ID=model-x and GEN_MODEL_TOOLS_PROVIDER=provider-b, GEN_MODEL_TOOLS_MODEL_ID=model-y, when a generation request arrives, then the system uses model-x for general generation and model-y for tool-calling tasks.
- A2: Given primary model failure (timeout, 429, 5xx, malformed structured output, or tool-call invalidity), when a request is processed, then the system automatically falls back to the next model in the configured chain within 5 seconds.
- A3: **[DEFERRED to V1.5/V2]** Given benchmark results showing Model B beats Model A by 5% weighted score with no regression on guardrail metrics (faithfulness ≤1% regression, structured output validity ≥98%, p95 latency within SLA) and lower cost, when promotion rules run, then Model B becomes primary for the next deployment cycle.
  - **Current status**: Tests exist for promotion criteria logic (in `tests/model-provider.test.ts`), but no actual benchmark harness, promotion system, or result storage is implemented.
  - **Implementation phase**: V1.5 (benchmark harness, nightly smoke checks, weekly benchmark jobs, promotion recommendations) → V2 (semi-automatic promotion).
- A4: Given manual override GEN_MODEL_PRIMARY_OVERRIDE_PROVIDER=provider-a, GEN_MODEL_PRIMARY_OVERRIDE_MODEL_ID=model-x, when runtime production traffic arrives for primary generation role only, then the system uses the specified override model regardless of automatic recommendations. Override scope is limited to runtime production traffic for the specified role and does not affect benchmark runs, evaluation routes, or tools routes.
- A5: Given local development environment, when embedding requests arrive, then the system uses a local embedding model via local provider with fallback to remote provider, with retrieval parity validation.
- A6: Given all models in a role are unavailable, when a request arrives, then the system returns a typed graceful degradation response distinguishing between no answer available, partial answer, stale cached answer, and fallback-generated minimal response.

## 9. Open Questions (Answered)

- **Safe promotion margin threshold**: Promote only when a candidate improves the weighted benchmark score by at least 5% over the incumbent, with no regression on guardrail metrics, and only after the result is confirmed in 2 consecutive benchmark runs.
- **Benchmark frequency**: Run nightly smoke benchmarks on a small golden set for drift detection and weekly full benchmarks for promotion decisions; also trigger ad hoc runs for new models or provider/version changes.
- **Model versioning and compatibility**: Use pinned model versions only, treat each version change as a new candidate, require compatibility tests before promotion, and keep the previous production version available for rollback during at least one release cycle.
- **Benchmark multilingual RAG datasets**: Use MIRACL for core multilingual retrieval, MMTEB for broad embedding evaluation, MLDR for long-document multilingual retrieval, MEMERAG for end-to-end multilingual RAG quality, and BEIR for English zero-shot robustness baseline.

## 10. Recommended Model Configuration

### Role-Based Model Matrix

| Role              | Model Type                 | Provider Type    | Rationale                                                                                           |
| ----------------- | -------------------------- | ---------------- | --------------------------------------------------------------------------------------------------- |
| GEN_MODEL_PRIMARY | Multilingual-capable model | Cloud deployment | Strong multilingual capabilities for general generation                                             |
| GEN_MODEL_TOOLS   | Tool-calling capable model | Cloud deployment | Better JSON/tool stability for structured output                                                    |
| GEN_MODEL_FAST    | Cost-effective model tier  | Cloud deployment | Cost-effective for low-risk tasks                                                                   |
| EVAL_MODEL        | Stable evaluation model    | Cloud deployment | Same family as primary for consistency, unless separate evaluator shows better faithfulness judging |

### Key Principle

Multilingual RAG quality depends on both retrieval and grounded answer generation. A model great at multilingual prose is not automatically best at tool use or schema reliability, hence the role-based approach.

## 10. Benchmarking Requirements

### Multilingual RAG Benchmark Matrix

| Dimension                     | What it measures                                         | Test cases                                              | Metric                                 | Pass threshold                         | Notes                                                   |
| ----------------------------- | -------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------- | -------------------------------------- | ------------------------------------------------------- |
| Query language handling       | System understands user questions in supported languages | ES query, EN query, NL query, mixed-language query      | Task success rate                      | ≥90% on golden set                     | Include code-switching and locale-specific phrasing     |
| Retrieval relevance           | Embedding + retrieval returns right chunks               | Top-k retrieval on multilingual docs                    | Recall@5, MRR, nDCG@10                 | Recall@5 ≥0.85                         | Measure separately for local and remote embeddings      |
| Cross-lingual retrieval       | Query in one language finds documents in another         | ES→EN, EN→ES, NL→EN, EN→NL                              | Recall@5                               | ≥0.75                                  | Essential if source content is not language-aligned     |
| Grounded answer accuracy      | Answer is correct given retrieved context                | Answer generation over curated context sets             | Exact match / rubric score             | ≥4/5 avg rubric                        | Prefer rubric for long-form answers                     |
| Faithfulness                  | Answer stays within evidence and avoids hallucinating    | Unanswerable, partially answerable, conflicting context | Faithfulness score, hallucination rate | Hallucination rate ≤5%                 | High priority for RAG quality                           |
| Citation quality              | Cited chunks actually support claims                     | Multi-claim answers with source refs                    | Citation precision                     | ≥0.9                                   | If product exposes references, make this a release gate |
| Structured output reliability | Responses conform to requested schema                    | JSON answers, tool args, extracted fields               | Valid JSON rate / schema pass rate     | ≥98%                                   | Important for tool-routing roles                        |
| Tool-calling robustness       | Model picks right tool and argument format               | Retrieval tool, answer tool, fallback tool              | Tool success rate                      | ≥95%                                   | Benchmark only for tool-capable routes                  |
| Latency                       | End-to-end responsiveness                                | p50/p95 across benchmark set                            | p50, p95 ms                            | p95 within product SLA                 | Track retrieval and generation separately               |
| Cost efficiency               | Quality delivered per dollar                             | Same benchmark set across models                        | Cost per successful task               | Better than incumbent by target margin | Needed for auto-promotion logic                         |
| Failure recovery              | How well fallback works under outages                    | Simulated timeout, 429, provider down                   | Recovery success rate, failover time   | Recovery ≥95%, failover < 5s           | Mirror hybrid embedding behavior                        |
| Language style quality        | Fluency, tone, grammar in each supported language        | Native-speaker rubric set in ES, EN, NL                 | Human rubric score                     | ≥4/5 each language                     | Keep separate from factual accuracy                     |

### Promotion Scoring Formula

Weights for multilingual RAG:

- Retrieval relevance: 20%
- Cross-lingual retrieval: 15%
- Grounded answer accuracy: 20%
- Faithfulness: 20%
- Structured output/tool reliability: 10%
- Latency: 10%
- Cost efficiency: 5%

Promotion requirements:

- Total weighted score beats incumbent by at least 5%
- Faithfulness does not regress by more than 1%
- Structured output validity does not regress below 98%
- p95 latency stays within SLA
- Failure recovery remains within 5 seconds

## 11. Benchmark Dataset Governance

### Public Benchmark Reference Set

| Dataset | Use it for                            | Why it matters                                                                                                                                                                                                                                                   |
| ------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MIRACL  | Core multilingual retrieval           | MIRACL is a human-annotated multilingual retrieval dataset covering 18 languages and is the strongest default retrieval benchmark for multilingual search. [project-miracl.github.io](https://project-miracl.github.io/)                                         |
| MMTEB   | Broad embedding evaluation            | MMTEB covers 500+ tasks across 250+ languages and is useful for comparing multilingual embedding backbones beyond one retrieval benchmark. [arxiv.org/abs/2308.03789](https://arxiv.org/abs/2308.03789)                                                          |
| MLDR    | Long-document multilingual retrieval  | MLDR targets multilingual long-document retrieval across 13 languages, which makes it highly relevant for real RAG pipelines. [huggingface.co/datasets/BeIR/mldr](https://huggingface.co/datasets/BeIR/mldr)                                                     |
| MEMERAG | End-to-end multilingual RAG quality   | MEMERAG is explicitly built as a multilingual end-to-end meta-evaluation RAG benchmark and focuses on faithfulness and relevance. [arxiv.org/abs/2406.05786](https://arxiv.org/abs/2406.05786)                                                                   |
| BEIR    | English zero-shot robustness baseline | BEIR is still useful as a broad zero-shot IR sanity check, even though it is not multilingual-first. [zilliz.com/blog/BEIR-a-Heterogeneous-Benchmark-for-Zero-shot-Retrieval](https://www.zilliz.com/blog/BEIR-a-Heterogeneous-Benchmark-for-Zeroshot-Retrieval) |

### Dataset Priority Strategy

1. **Internal Golden Set**: Prioritize domain-specific internal datasets for hospitality/tourism content
2. **Public Benchmarks**: Use above public datasets for cross-validation and baseline comparison
3. **Mixed Evaluation**: Combine internal domain tests with public benchmarks for comprehensive assessment

## 12. Implementation Constraints

- Benchmarking shall evaluate retrieval, generation, and fallback separately for multilingual RAG workflows rather than using a single aggregate model score
- Automatic promotion shall require both aggregate improvement and no regression on guardrail metrics including faithfulness, structured output validity, and latency
- Embedding model swaps shall require retrieval parity validation in addition to vector dimensionality compatibility
- Role routing in v1 shall be rule-based; learned task classification is deferred unless benchmark evidence shows material routing ambiguity
- Model versions shall be pinned to prevent silent behavior changes through "latest" aliases
- Benchmark datasets shall prioritize internal golden sets over generic public benchmarks for domain-specific evaluation
