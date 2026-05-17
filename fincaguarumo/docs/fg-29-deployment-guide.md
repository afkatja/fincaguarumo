# FG-29 Role-Based Model Provider Deployment Guide

## Overview

The FG-29 role-based model provider system uses environment variables to configure AI models for different roles. This guide explains how to configure the system for production deployment.

## Environment Variables

### Canonical Naming Convention

Use the canonical format `{ROLE}_{ATTRIBUTE}` for new configurations:

**Generation Roles:**

- `GEN_MODEL_PRIMARY_PROVIDER`, `GEN_MODEL_PRIMARY_MODEL_ID`, `GEN_MODEL_PRIMARY_FALLBACKS`
- `GEN_MODEL_TOOLS_PROVIDER`, `GEN_MODEL_TOOLS_MODEL_ID`, `GEN_MODEL_TOOLS_FALLBACKS`
- `GEN_MODEL_FAST_PROVIDER`, `GEN_MODEL_FAST_MODEL_ID`, `GEN_MODEL_FAST_FALLBACKS`

**Evaluation Role:**

- `EVAL_MODEL_PROVIDER`, `EVAL_MODEL_MODEL_ID`, `EVAL_MODEL_FALLBACKS`

**Embedding Roles:**

- `EMBED_MODEL_LOCAL_PROVIDER`, `EMBED_MODEL_LOCAL_MODEL_ID`, `EMBED_MODEL_LOCAL_FALLBACKS`
- `EMBED_MODEL_REMOTE_PROVIDER`, `EMBED_MODEL_REMOTE_MODEL_ID`, `EMBED_MODEL_REMOTE_FALLBACKS`

### Backward Compatibility

Legacy variables are still supported:

- `MAIN_MODEL_PROVIDER`, `MAIN_MODEL_ID` → maps to `GEN_MODEL_PRIMARY_*`
- `EMBEDDING_MODEL_PROVIDER`, `EMBEDDING_MODEL_ID` → maps to `EMBED_MODEL_REMOTE_*`

## API Keys

Each provider requires its API key in the environment:

```bash
# Together AI
TOGETHER_API_KEY=your_together_api_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key

# Perplexity
PERPLEXITY_API_KEY=your_perplexity_api_key

# Mistral
MISTRAL_API_KEY=your_mistral_api_key
```

## Example Configurations

### Production Configuration

```bash
# Primary Generation (multilingual, high quality)
GEN_MODEL_PRIMARY_PROVIDER=together
GEN_MODEL_PRIMARY_MODEL_ID=Qwen/Qwen3-30B-A3B
GEN_MODEL_PRIMARY_FALLBACKS=together:Qwen/Qwen3-8B,openai:gpt-4o-mini

# Tools Generation (structured output, tool calling)
GEN_MODEL_TOOLS_PROVIDER=together
GEN_MODEL_TOOLS_MODEL_ID=Qwen/Qwen3-30B-A3B
GEN_MODEL_TOOLS_FALLBACKS=together:Qwen/Qwen3-8B

# Fast Generation (cost-effective)
GEN_MODEL_FAST_PROVIDER=together
GEN_MODEL_FAST_MODEL_ID=Qwen/Qwen3-8B

# Evaluation
EVAL_MODEL_PROVIDER=together
EVAL_MODEL_MODEL_ID=Qwen/Qwen3-14B
EVAL_MODEL_FALLBACKS=together:Qwen/Qwen3-8B

# Remote Embeddings (production)
EMBED_MODEL_REMOTE_PROVIDER=together
EMBED_MODEL_REMOTE_MODEL_ID=intfloat/e5-base-instruct
```

### Development Configuration

```bash
# Local development with Ollama
EMBED_MODEL_LOCAL_PROVIDER=local
EMBED_MODEL_LOCAL_MODEL_ID=nomic-embed-text

# Use cloud models for generation in dev
GEN_MODEL_PRIMARY_PROVIDER=together
GEN_MODEL_PRIMARY_MODEL_ID=Qwen/Qwen3-30B-A3B
```

## Fallback Chain Format

Fallback chains use comma-separated `provider:model` pairs:

```bash
GEN_MODEL_PRIMARY_FALLBACKS=together:Qwen/Qwen3-8B,openai:gpt-4o-mini,mistral:mistral-small
```

The system attempts models in the exact order specified.

## Manual Overrides (Emergency Use)

For emergency fixes, use override variables (limited to primary generation role only):

```bash
GEN_MODEL_PRIMARY_OVERRIDE_PROVIDER=perplexity
GEN_MODEL_PRIMARY_OVERRIDE_MODEL_ID=llama-3.1-sonar-large-128k-online
```

**Important:** Overrides are ignored during benchmark runs, evaluation routes, and tools routes per A4 scope restrictions.

## Model Parameters

Optional parameters can be configured per role:

```bash
GEN_MODEL_PRIMARY_MAX_TOKENS=2000
GEN_MODEL_PRIMARY_TEMPERATURE=0.3
EVAL_MODEL_MAX_TOKENS=4000
EVAL_MODEL_TEMPERATURE=0.1
```

## Environment Selection

The system automatically selects adapters based on environment:

- **Development**: Uses local Ollama when `NODE_ENV=development` and adapter is "local"
- **Production**: Uses remote cloud providers

## Validation

The system validates configuration on startup:

```bash
# Check configuration validity (using tsx like other scripts)
npx tsx --require dotenv/config -e "import { validateModelEnvironment } from './src/lib/model-gateway'; console.log(validateModelEnvironment())"

# Alternative: Create a temporary validation script
echo "import { validateModelEnvironment } from './src/lib/model-gateway'; console.log(validateModelEnvironment())" > temp-validation.ts && npx tsx --require dotenv/config temp-validation.ts && rm temp-validation.ts
```

## Monitoring

Monitor these logs for system health:

- `🔄 Fallback attempt for {role}` - Model failures and fallback attempts
- `💥 All models failed for role {role}` - Complete role failures
- `🔧 Circuit breaker state updated for {role}` - Circuit breaker events
- `🔄 Starting background health check refresh` - Background health checks

## Troubleshooting

### Common Issues

1. **Missing API Keys**: Ensure all required API keys are set for configured providers
2. **Invalid Model Names**: Verify model references match provider expectations
3. **Circuit Breaker Active**: Models may be temporarily disabled after repeated failures
4. **Fallback Chain Too Long**: Keep fallback chains under 5 seconds total duration

### Debug Commands

```bash
# Test model connectivity (using tsx like other scripts)
npx tsx --require dotenv/config -e "import { testModelConnectivity } from './src/lib/model-gateway'; testModelConnectivity('primary').then(console.log)"

# Check available models (using tsx)
npx tsx --require dotenv/config -e "import { getAvailableModels } from './src/lib/model-gateway'; console.log(getAvailableModels())"

# Validate environment (using tsx)
npx tsx --require dotenv/config -e "import { validateModelEnvironment } from './src/lib/model-gateway'; console.log(validateModelEnvironment())"

# Alternative: Create temporary scripts for easier debugging
echo "import { testModelConnectivity } from './src/lib/model-gateway'; testModelConnectivity('primary').then(console.log)" > temp-test.ts && npx tsx --require dotenv/config temp-test.ts && rm temp-test.ts
```

## Security Considerations

- Never commit API keys to version control
- Use environment-specific API keys (separate dev/prod keys)
- Rotate API keys regularly via provider dashboards
- Monitor API key usage and costs
- Implement proper secret management in production

## Performance Tuning

- Monitor model selection latency (< 50ms target)
- Track fallback chain duration (< 5s target)
- Adjust fallback chains based on reliability
- Consider regional deployment for latency optimization
