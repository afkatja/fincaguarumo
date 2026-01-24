# AI Chat Implementation Plan

## Overview

Integrate Better Chatbot to provide AI-powered guidance throughout the booking process.

## Technical Implementation

### 1. Setup Better Chatbot API

```typescript
// src/app/api/chat/route.ts
import { NextResponse } from "next/server"
import { createChatSession } from "better-chatbot"

export async function POST(request: Request) {
  const { messages, threadId } = await request.json()

  const session = await createChatSession({
    model: "mistral-7b",
    messages,
    threadId,
    tools: ["booking_calendar", "availability_check"],
  })

  return NextResponse.json(session)
}
```

### 2. Create Booking Agent Configuration

```typescript
// src/lib/bookingAgent.ts
import { createAgent } from "mistral-7b"

export const bookingAgent = createAgent({
  name: "Booking Assistant",
  description: "Helps users book Villa Bruno",
  instructions: {
    systemPrompt: `
      You are a helpful booking assistant for Villa Bruno.
      Your tasks:
      1. Guide users through the booking process
      2. Answer questions about the property
      3. Check availability
      4. Provide booking confirmation
      
      Always be friendly and helpful.
      Use tools when appropriate.
      Never share personal information.
    `,
    tools: ["check_availability", "create_booking"],
  },
})
```

### 3. Chat UI Component

```typescript
// src/components/BookingChat.tsx
'use client'
import { useChat } from 'mistral-7b-react'
import { bookingAgent } from '../lib/bookingAgent'

export default function BookingChat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    agent: bookingAgent,
    initialMessages: [
      {
        role: 'assistant',
        content: 'Hello! How can I help you book Villa Bruno today?'
      }
    ]
  })

  return (
    <div className="booking-chat">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role}>{msg.content}</div>
        ))}
      </div>
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about booking..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  )
}
```

### 4. Integration Points

#### Homepage (Floating Button)

```typescript
// src/app/[locale]/page.tsx
import BookingChat from '../../components/BookingChat'

// Add to layout
<BookingChat position="floating" />
```

#### Villa Pages (Sidebar)

```typescript
// src/app/[locale]/(pages)/[slug]/page.tsx
import BookingChat from '../../../components/BookingChat'

// Add to sidebar
<BookingChat position="sidebar" />
```

#### Booking Dialog (Embedded)

```typescript
// src/app/[locale]/(pages)/BookingDialog.tsx
import BookingChat from '../BookingChat'

// Add to dialog
<BookingChat position="embedded" context="booking" />
```

## Tools Implementation

### 1. Availability Check Tool

```typescript
// src/lib/tools/availability.ts
export async function checkAvailability({ checkIn, checkOut }) {
  // Reuse existing logic from src/app/api/ical/merged/route.ts
  const response = await fetch("/api/availability", {
    method: "POST",
    body: JSON.stringify({ checkIn, checkOut }),
  })

  return response.json()
}
```

### 2. Booking Creation Tool

```typescript
// src/lib/tools/booking.ts
export async function createBooking(bookingData) {
  // Migrate existing Sanity logic to Supabase
  const response = await fetch("/api/bookings", {
    method: "POST",
    body: JSON.stringify(bookingData),
  })

  return response.json()
}
```

## Multi-language Support

### 1. Language Detection

```typescript
// src/lib/chatUtils.ts
export function detectLanguage(userInput: string): string {
  // Implement language detection logic
  // Return language code (en, es, de, etc.)
}
```

### 2. Localized Responses

```typescript
// src/lib/localization.ts
export function getLocalizedResponse(key: string, language: string): string {
  const translations = {
    en: {
      greeting: "Hello! How can I help you book Villa Bruno?",
    },
    es: {
      greeting: "¡Hola! ¿Cómo puedo ayudarte a reservar Villa Bruno?",
    },
    // Add more languages
  }

  return translations[language]?.[key] || translations.en[key]
}
```

## Testing Plan

### 1. Unit Tests

- Test chat initialization
- Test message handling
- Test tool integration

### 2. Integration Tests

- Test with booking system
- Test multi-language support
- Test error handling

### 3. User Testing

- Test with real users
- Gather feedback
- Iterate on improvements

## Deployment Plan

### Phase 1: Basic Chat

- Deploy chat interface
- Basic responses
- No tools integration

### Phase 2: Smart Assistant

- Add tools integration
- Context-aware responses
- Booking guidance

### Phase 3: Full Integration

- Multi-language support
- Personalized recommendations
- Analytics and improvements

## Success Metrics

- User engagement with chat
- Reduction in support inquiries
- Conversion rate improvement
- User satisfaction scores
