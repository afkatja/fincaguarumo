---
description: Debug booking + chat assistant flow with systematic error identification and fixing
---

# Booking + Chat Assistant Debug Skill

## Overview

This skill provides systematic debugging for the Finca Guarumo booking and chat assistant flow, breaking down the complex system into testable components and providing targeted error analysis.

## Flow Architecture

### 1. UI Layer Components

- **BookingChat.tsx** - Simple Mistral-based chat interface
- **ChatInterface.tsx** - Advanced chat with RAG, streaming, and context awareness
- **BookingForm.tsx** - Booking creation form
- **BookingCalendar.tsx** - Date selection interface

### 2. API Layer Endpoints

- **/api/chat** - Advanced chat with RAG and hallucination evaluation
- **/api/bookings** - CRUD operations for bookings
- **/api/availability** - Date availability checking

### 3. Data Processing Layer

- **RAG Context Builder** - Semantic and keyword-based retrieval
- **Sanity Data Extractor** - Content management integration
- **Supabase Integration** - Booking and availability storage
- **AI Services** - Chat completion and tool execution

### 4. AI/ML Layer

- **Intent Detection** - User query classification
- **Semantic Search** - Embedding-based content retrieval
- **Hallucination Evaluation** - Response accuracy validation
- **Tool Execution** - Booking and availability operations

## Debugging Steps

### Step 1: UI Component Validation

**Purpose**: Verify frontend components render and handle user input correctly

**Test Commands**:

```bash
# Test component rendering
npm run test -- --testPathPattern=BookingChat
npm run test -- --testPathPattern=ChatInterface

# Check for React errors
npm run build
npm run dev
```

**Common Issues**:

- Missing props or incorrect prop types
- State management errors
- Event handler failures
- Translation key mismatches

**Log Locations**:

- Browser console for React errors
- Network tab for API call failures
- React DevTools for component state

### Step 2: API Endpoint Testing

**Purpose**: Verify API routes handle requests correctly

**Test Commands**:

```bash
# Test chat API
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}],"locale":"en"}'

# Test booking API
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"checkIn":"2024-01-01","checkOut":"2024-01-02","guestName":"Test"}'

# Test availability
curl -X GET http://localhost:3000/api/availability?from=2024-01-01&to=2024-01-02
```

**Common Issues**:

- Missing environment variables
- Database connection failures
- Request validation errors
- Response formatting issues

**Log Locations**:

- `npm run dev` terminal output
- Netlify function logs
- Supabase dashboard logs

### Step 3: RAG Context Validation

**Purpose**: Verify semantic and keyword-based content retrieval

**Test Commands**:

```bash
# Test RAG context building
node -e "
const { buildRAGContext } = require('./src/lib/rag-context-builder');
buildRAGContext('What amenities are available?', {page: 'homepage', locale: 'en'})
  .then(console.log)
  .catch(console.error);
"

# Test semantic RAG setup
node -e "
const { validateSemanticRAGSetup } = require('./src/lib/semantic-rag/semantic-context-builder');
validateSemanticRAGSetup()
  .then(console.log)
  .catch(console.error);
"
```

**Common Issues**:

- Sanity CMS connection failures
- Missing or corrupted embeddings
- Intent detection failures
- Context formatting errors

**Log Locations**:

- Console output in API route
- Sanity dashboard logs
- Embedding service logs

### Step 4: AI Service Integration

**Purpose**: Verify AI model responses and tool execution

**Architecture Notes**:

- **Generation Model**: Perplexity Sonar Pro for chat responses
- **Evaluation Model**: Mistral large-latest for hallucination detection
- **Model-Agnostic Design**: Testing patterns work with any AI SDK-compatible model

**Test Commands**:

```bash
# Test Perplexity Sonar Pro (generation model)
node -e "
const { perplexity } = require('@ai-sdk/perplexity');
const model = perplexity('sonar-pro');
const { streamText } = require('ai');
const result = await streamText({
  model,
  messages: [{role: 'user', content: 'Hello'}],
  maxTokens: 100
});
for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
"

# Test Mistral large-latest (evaluation model)
node -e "
const { mistral } = require('@ai-sdk/mistral');
const model = mistral('mistral-large-latest');
const { generateText } = require('ai');
const result = await generateText({
  model,
  prompt: 'Evaluate this response for accuracy: \"Villa Bruno has 5 bedrooms\"',
  temperature: 0.1
});
console.log(result.text);
"

# Test model-agnostic tool execution
node -e "
const { createModelProvider } = require('./src/lib/model-provider-factory');
const generationModel = createModelProvider('generation');
const evaluationModel = createModelProvider('evaluation');
console.log('Generation model:', generationModel.modelId);
console.log('Evaluation model:', evaluationModel.modelId);
"

# Test tool execution with current models
node -e "
const { bookingTools } = require('./src/lib/better-chatbot/config');
console.log('Available tools:', Object.keys(bookingTools));
"
```

**Common Issues**:

- Invalid API keys (PERPLEXITY_API_KEY, MISTRAL_API_KEY)
- Model availability issues (Sonar Pro, Mistral large-latest)
- Tool execution failures
- Rate limiting on AI services

**Log Locations**:

- Perplexity dashboard logs
- Mistral dashboard logs
- API route console output
- Network request logs
- Rate limiting

### Step 5: Database Operations

**Purpose**: Verify Supabase CRUD operations and data integrity

**Test Commands**:

```bash
# Test database connection
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_API_KEY);
supabase.from('bookings').select('count').then(console.log).catch(console.error);
"

# Test availability table
node -e "
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_API_KEY);
supabase.from('availability').select('*').limit(1).then(console.log).catch(console.error);
"
```

**Common Issues**:

- Connection string errors
- Row Level Security (RLS) policy blocks
- Schema mismatches
- Data type conflicts

**Log Locations**:

- Supabase dashboard logs
- Database query logs
- API route error responses

## Error Classification System

### Critical Errors (Block entire flow)

- **Environment Variables Missing**: `MISTRAL_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`
- **Database Connection Failed**: Supabase unreachable
- **AI Service Unavailable**: Mistral API down
- **Schema Mismatch**: Database columns don't match code expectations

### High Priority Errors (Break core functionality)

- **RAG Context Builder Fails**: No content retrieved for responses
- **Tool Execution Errors**: Booking/availability operations fail
- **Authentication Failures**: API keys invalid or expired
- **Memory/Performance Issues**: Timeouts, memory leaks

### Medium Priority Errors (Degrade experience)

- **Hallucination Detection**: AI provides inaccurate information
- **Partial Content Retrieval**: Some RAG sources fail
- **Rate Limiting**: Temporary service restrictions
- **Translation Issues**: Missing localization keys

### Low Priority Errors (Minor UX issues)

- **UI Styling**: CSS/layout problems
- **Loading States**: Missing or incorrect spinners
- **Validation Messages**: Unclear error text
- **Accessibility**: Screen reader issues

## Automated Testing Strategy

### Unit Tests

```bash
# Test individual functions
npm run test -- src/lib/rag-context-builder.test.ts
npm run test -- src/lib/better-chatbot/config.test.ts
npm run test -- src/app/api/chat/route.test.ts
```

### Integration Tests

```bash
# Test API endpoints
npm run test -- tests/api/chat.integration.test.ts
npm run test -- tests/api/bookings.integration.test.ts

# Test database operations
npm run test -- tests/database/bookings.test.ts
npm run test -- tests/database/availability.test.ts
```

### End-to-End Tests

```bash
# Test complete user flows
npm run test:e2e -- tests/e2e/booking-flow.spec.ts
npm run test:e2e -- tests/e2e/chat-interaction.spec.ts
```

## Monitoring and Alerting

### Key Metrics to Monitor

- **API Response Times**: Chat, bookings, availability
- **Error Rates**: By endpoint and error type
- **AI Model Performance**: Response quality, hallucination scores
- **Database Performance**: Query times, connection pool usage

### Log Analysis

```bash
# Filter for errors in production
grep "ERROR" /var/log/app.log | tail -50

# Monitor API response times
grep "POST /api/chat" /var/log/access.log | awk '{print $NF}' | sort -n

# Track database queries
grep "supabase" /var/log/app.log | grep "ERROR\|WARN"
```

### Health Checks

```bash
# API health endpoint
curl http://localhost:3000/api/health

# Database connectivity
curl http://localhost:3000/api/health/database

# AI service status
curl http://localhost:3000/api/health/ai-services
```

## Common Debugging Scenarios

### Scenario 1: Chat Not Responding

1. **Check UI**: Browser console for JavaScript errors
2. **Check API**: `curl` the `/api/chat` endpoint directly
3. **Check AI Service**: Verify Mistral API key and availability
4. **Check Environment**: Ensure all required env vars are set

### Scenario 2: Booking Creation Fails

1. **Check Form Data**: Verify all required fields are present
2. **Check API**: Test `/api/bookings` with sample data
3. **Check Database**: Verify Supabase connection and table schema
4. **Check Availability**: Ensure dates are not already booked

### Scenario 3: RAG Context Empty

1. **Check Sanity**: Verify CMS is accessible and has content
2. **Check Embeddings**: Ensure semantic search is configured
3. **Check Intent Detection**: Test query classification
4. **Check Language Support**: Verify content exists for user's locale

### Scenario 4: High Hallucination Scores

1. **Check Ground Truth**: Verify Sanity data is accurate and complete
2. **Check Prompt Engineering**: Review system prompts and constraints
3. **Check Tool Usage**: Ensure AI uses provided tools instead of guessing
4. **Check Evaluation Logic**: Verify hallucination detection algorithm

## Quick Fix Commands

### Environment Issues

```bash
# Check missing environment variables
npm run env:check

# Regenerate required secrets
npm run secrets:generate
```

### Database Issues

```bash
# Reset database schema
npm run db:reset

# Run migrations
npm run db:migrate

# Check RLS policies
npm run db:check-rls
```

### AI Service Issues

```bash
# Test AI service connection
npm run ai:test-connection

# Clear AI service cache
npm run ai:clear-cache

# Rebuild embeddings
npm run ai:rebuild-embeddings
```

### Performance Issues

```bash
# Clear Next.js cache
rm -rf .next

# Rebuild dependencies
npm ci

# Optimize images
npm run optimize:images
```

## Documentation References

**Existing Documentation**:

- **Project README**: `/README.md`
- **Package Configuration**: `/package.json`
- **Environment Variables**: `/.env.example`

**Generate Missing Documentation**:

```bash
# Create API documentation
mkdir -p docs/api
echo "# API Endpoints" > docs/api/README.md
echo "- /api/chat - Chat assistant endpoint" >> docs/api/README.md
echo "- /api/bookings - Booking CRUD operations" >> docs/api/README.md

# Create database schema documentation
mkdir -p docs
echo "# Database Schema" > docs/database-schema.md
echo "## Tables" >> docs/database-schema.md
echo "- bookings" >> docs/database-schema.md
echo "- availability" >> docs/database-schema.md

# Create AI configuration documentation
echo "# AI Configuration" > docs/ai-setup.md
echo "## Models" >> docs/ai-setup.md
echo "- Generation: Perplexity Sonar Pro" >> docs/ai-setup.md
echo "- Evaluation: Mistral large-latest" >> docs/ai-setup.md

# Create deployment guide
echo "# Deployment Guide" > docs/deployment.md
echo "## Environment Setup" >> docs/deployment.md
echo "## Build Process" >> docs/deployment.md
```

This skill provides a comprehensive approach to debugging the booking and chat assistant flow, enabling systematic identification and resolution of issues across the entire stack.
