---
title: "Finalize chatbot implementation"
linear_key: "FG-8"
description: "Complete end-to-end conversational booking flow from chat to confirmed payment"
author: "Katja Hollaar"
created: "2026-04-12"
status: "draft"
---

## Overview

Allow a website visitor to go from "curious about dates" to a confirmed, paid booking entirely through a conversational chat interface — without ever needing to navigate to a separate booking form.

## Current State

The booking assistant combines a RAG-powered chat layer with a full booking pipeline (availability check → pricing → Stripe → confirmation email). It has two rendering modes: a floating button/sidebar overlay (site-wide) and an inline embedded version for booking page.

### Implemented Components

**UI Layer (`src/components/better-chatbot/`)**

- `ChatInterface.tsx` — Full conversational UI with message history, streaming response rendering, suggested prompts, and booking state transitions
- `SidebarChat.tsx` — Slide-in sidebar panel variant (used globally via layout)
- `FloatingChatButton.tsx` — Fixed floating button that triggers sidebar
- `EmbeddedChat.tsx` — Inline version embedded directly in the booking page

**AI / RAG Layer (`src/lib/`)**

- `rag-context-builder.ts` — Keyword-based context assembly from Sanity content
- `sanity-data-extractor.ts` — Extracts and normalises all Sanity content types
- `intent-detection.ts` — Classifies user messages into intents
- `model-provider-factory.ts` — Abstracts LLM provider (OpenAI / Anthropic / local Ollama)
- `bookingAgent.ts` — Orchestrates multi-step booking flow driven by chat state

**Semantic RAG (`src/lib/semantic-rag/`)**

- Complete semantic search pipeline with Supabase pgvector storage
- Hybrid retrieval combining semantic + keyword matching
- LangChain-style retrieval chains

**Booking Logic (`src/lib/`)**

- `pricingEngine.ts` — Calculates nightly rate, seasonal pricing, cleaning fee, taxes
- `setBookings.ts` — Writes confirmed booking to Supabase
- `sendConfirmationEmail.ts` — Resend-based email notifications
- Date parsing utilities with locale awareness

**API Routes (`src/app/api/`)**

- `/api/chat` — Main streaming chat endpoint
- `/api/availability` — Returns blocked dates from Supabase
- `/api/bookings` — POST to create booking record
- `/api/embeddings` — Generates and stores embeddings for RAG
- `/api/create-checkout-session` — Stripe checkout session creation
- `/api/stripe-webhook` — Handles `checkout.session.completed` to confirm booking

## Requirements

### Functional Requirements

#### FR1: Conversational Availability Query

- User can type natural language availability queries (e.g., "do you have availability in July for 5 nights?")
- System must check real Supabase booking data and provide accurate availability response
- Response should include alternative date suggestions if requested dates are unavailable

#### FR2: Property Information Q&A

- User can ask questions about Finca Guarumo or Villa Bruno properties
- System must provide answers based on content in Sanity CMS
- Questions outside knowledge base must be politely declined with explanation

#### FR3: End-to-End Booking Flow

- User can complete entire booking process through chat interface
- Flow: availability check → price quote → guest details collection → Stripe payment → confirmation
- All booking data (name, dates, guests) must be captured via conversation
- Stripe payment link must be generated and presented within chat

#### FR4: Payment Confirmation

- After successful Stripe payment, booking status must be updated in Supabase
- Confirmation email must be sent to both guest and property owner
- Chat should display booking confirmation details

#### FR5: Mobile Responsiveness

- Floating chat button and sidebar must render correctly on mobile (375px viewport)
- Embedded chat must be fully functional on mobile devices
- Touch interactions must be optimized for mobile use

#### FR6: Context Awareness

- Embedded chat should pre-fill dates from URL parameters when user arrives from booking page
- Chat should be aware of which property page the user is viewing
- Previous conversation context should be maintained within session

### Non-Functional Requirements

#### NFR1: Security

- `/api/cleanup` and `/api/force-delete` must be protected or removed before production
- All API endpoints must validate input and sanitize data
- Stripe webhook must verify signature before processing

#### NFR2: Performance

- Chat responses should stream in real-time with typing indicators
- Semantic search should return results within 2 seconds
- RAG context building should not block chat flow

#### NFR3: Reliability

- Stripe webhook processing must be idempotent and handle retries
- Booking creation must be atomic to prevent double bookings
- Error states must be gracefully handled with user-friendly messages

#### NFR4: Internationalization

- Date parsing must support formats listed in locales
- Chat responses should support multiple languages where content exists
- Error messages must be localized

## Acceptance Criteria

### AC1: Availability Queries

- [ ] User can ask "do you have availability in July for 5 nights?" and receive correct answer based on real Supabase booking data
- [ ] System provides alternative date suggestions when requested dates are unavailable
- [ ] Availability responses include pricing information when dates are available

### AC2: Property Information

- [ ] User can ask relevant questions about Finca Guarumo or Villa Bruno and receive correct answers based on Sanity content
- [ ] System refuses to answer questions outside knowledge base (e.g., "what's the best restaurant in San José?")
- [ ] Responses are contextual and property-specific when appropriate

### AC3: Complete Booking Flow

- [ ] User can complete booking (name, dates, guests) entirely through chat
- [ ] System generates Stripe payment link within chat interface
- [ ] All required booking fields are collected conversationally
- [ ] Booking summary is presented before payment

### AC4: Payment and Confirmation

- [ ] After successful Stripe payment, booking status is updated in Supabase
- [ ] Confirmation email is sent to guest and owner
- [ ] Chat displays booking confirmation with all details
- [ ] Webhook processing is reliable and handles edge cases

### AC5: Mobile Experience

- [ ] Floating chat button and sidebar render correctly on mobile (375px)
- [ ] Embedded chat is fully functional on mobile devices
- [ ] Touch interactions work smoothly on mobile
- [ ] No horizontal scroll or layout breaks on mobile

### AC6: Context Integration

- [ ] Embedded chat pre-fills dates from URL params if present
- [ ] Chat maintains conversation context within session
- [ ] Page context (villa, dates) is correctly injected into chat

### AC7: Security and Ops

- [ ] `/api/cleanup` and `/api/force-delete` are protected with secret header or removed
- [ ] All environment variables are documented as mandatory vs optional
- [ ] Stripe webhook signature verification is implemented
- [ ] Input validation is implemented on all API endpoints

## Technical Specifications

### API Endpoints

#### `/api/chat`

- **Method**: POST
- **Authentication**: None (public)
- **Request**: `{ message: string, sessionId?: string, context?: ChatContext }`
- **Response**: Streaming text response with tool calls
- **Tools**: availability_check, create_booking, get_property_info

#### `/api/availability`

- **Method**: GET
- **Authentication**: None
- **Request**: `{ startDate?: string, endDate?: string, propertyId?: string }`
- **Response**: `{ available: boolean, blockedDates: string[], alternatives?: DateRange[] }`

#### `/api/bookings`

- **Method**: POST
- **Authentication**: None (public booking creation)
- **Request**: `{ name: string, email: string, startDate: string, endDate: string, guests: number, propertyId: string }`
- **Response**: `{ bookingId: string, status: 'pending' | 'confirmed', stripeCheckoutUrl?: string }`

#### `/api/stripe-webhook`

- **Method**: POST
- **Authentication**: Stripe signature verification
- **Events**: `checkout.session.completed`
- **Actions**: Update booking status, send confirmation email

### Data Models

#### Booking

```typescript
interface Booking {
  id: string
  name: string
  email: string
  startDate: Date
  endDate: Date
  guests: number
  propertyId: string
  status: "pending" | "confirmed" | "cancelled"
  stripeCheckoutSessionId?: string
  totalAmount: number
  createdAt: Date
  updatedAt: Date
}
```

#### ChatContext

```typescript
interface ChatContext {
  propertyId?: string
  preselectedDates?: {
    startDate?: string
    endDate?: string
  }
  currentPage?: string
  userAgent?: string
}
```

### Integration Points

#### Sanity CMS

- Property descriptions, amenities, policies
- FAQ content
- Pricing rules and seasonal rates
- Property images and media

#### Supabase

- Booking records storage
- Blocked dates calendar
- Vector store for semantic search (pgvector)

#### Stripe

- Payment processing
- Checkout session creation
- Webhook event handling

#### Resend

- Confirmation emails to guests
- Notification emails to property owner
- Error notification emails

## Testing Strategy

### Unit Tests

- Intent detection accuracy with various user inputs
- Date parsing for multiple locales and formats
- Pricing engine calculations with seasonal rates
- Email template rendering

### Integration Tests

- End-to-end booking flow with test Stripe credentials
- Semantic search accuracy with real Sanity content
- Webhook processing reliability
- Context injection from URL parameters

### E2E Tests

- Mobile responsive chat interface
- Complete booking flow on multiple devices
- Error handling and recovery
- Performance under load

### Security Tests

- Input validation on all endpoints
- Stripe webhook signature verification
- SQL injection prevention
- XSS prevention in chat responses

## Deployment Considerations

### Environment Variables

```
# Required
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=ant-...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...

# Optional
OLLAMA_BASE_URL=http://localhost:11434
```

### Database Setup

- Supabase pgvector extension installed
- Vector store tables created and indexed
- Booking tables with proper constraints
- Row Level Security policies for bookings

### Monitoring

- Stripe webhook delivery success rate
- Chat response latency
- Booking conversion rate
- Error rates and types

## Rollout Plan

### Phase 1: Core Flow Testing

1. Test end-to-end booking flow with real dates
2. Verify Stripe webhook → booking update → email sequence
3. Test mobile responsiveness across devices
4. Validate semantic RAG accuracy

### Phase 2: Security Hardening

1. Protect or remove cleanup endpoints
2. Implement input validation
3. Add rate limiting to chat endpoint
4. Security audit of all API routes

### Phase 3: Production Deployment

1. Environment variable documentation
2. Database migration scripts
3. Monitoring and alerting setup
4. User acceptance testing

### Phase 4: Post-Launch

1. Monitor conversion rates and user feedback
2. Optimize chat responses based on real interactions
3. Add missing property information to Sanity
4. Performance optimization based on usage patterns

## Success Metrics

- **Booking Conversion Rate**: % of chat users who complete booking
- **First Response Time**: Average time to initial availability response
- **Error Rate**: % of failed bookings or chat errors
- **User Satisfaction**: Post-booking feedback scores
- **Mobile Usage**: % of bookings completed on mobile devices

## Risks and Mitigations

### Technical Risks

- **Stripe webhook failures**: Implement retry logic and manual recovery
- **Semantic search accuracy**: Maintain hybrid keyword + semantic approach
- **Mobile performance**: Optimize bundle size and implement lazy loading

### Business Risks

- **User adoption**: Provide clear onboarding and suggested prompts
- **Booking abandonment**: Implement recovery flows for interrupted sessions
- **Customer support**: Clear escalation paths from chat to human support

## Dependencies

### Critical Path Dependencies

- Supabase booking data integrity
- Stripe payment processing reliability
- Sanity content completeness
- Email delivery service stability

### Optional Dependencies

- Local Ollama for development
- Advanced analytics for chat optimization
- A/B testing framework for conversion optimization
