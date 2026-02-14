# Chat Interface Enhancement Plan

## Overview

This plan addresses three issues in the chat interface:

1. Assistant messages should support markdown rendering
2. The assistant should perform API calls when relevant (availability, bookings, merged)
3. The assistant should be able to calculate prices and display detailed overviews

## Current State Analysis

### ChatInterface.tsx

- **Location**: [`src/components/better-chatbot/ChatInterface.tsx`](src/components/better-chatbot/ChatInterface.tsx)
- **Issue**: Assistant messages render as plain text (line 341: `{msg.content}`)
- **Streaming**: Uses SSE streaming but only handles text content, not tool calls

### config.ts - bookingTools

- **Location**: [`src/lib/better-chatbot/config.ts`](src/lib/better-chatbot/config.ts:52)
- **Issue**: Tools are defined with `inputSchema` but lack `execute` functions
- **Current tools**: `checkAvailability`, `createBooking`, `getPropertyInfo`

### API Routes Available

- [`/api/availability`](src/app/api/availability/route.ts) - POST to check availability, GET for unavailable ranges
- [`/api/bookings`](src/app/api/bookings/route.ts) - Full CRUD for bookings
- [`/api/ical/merged`](src/app/api/ical/merged/route.ts) - Syncs external bookings

### Price Calculation

- [`calculateTotal.ts`](src/lib/calculateTotal.ts) - Core pricing logic
- [`priceCalculation.tsx`](src/components/priceCalculation.tsx) - UI component for price breakdown

---

## Implementation Plan

### Phase 1: Markdown Support for Assistant Messages

#### 1.1 Install Dependencies

```bash
npm install react-markdown remark-gfm
```

#### 1.2 Update ChatBody Component

**File**: [`src/components/better-chatbot/ChatInterface.tsx`](src/components/better-chatbot/ChatInterface.tsx:318)

- Import `react-markdown` and `remark-gfm`
- Create a Markdown renderer component with proper styling
- Apply to assistant messages only

```tsx
// Example implementation
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className="prose prose-sm max-w-none"
    >
      {content}
    </ReactMarkdown>
  )
}
```

#### 1.3 Add Styling

- Add prose/tailwind typography styles for markdown content
- Ensure code blocks, lists, and links render properly

---

### Phase 2: Tool Execution Implementation

#### 2.1 Add Execute Functions to Tools

**File**: [`src/lib/better-chatbot/config.ts`](src/lib/better-chatbot/config.ts:52)

Update each tool to include an `execute` function:

```typescript
export const bookingTools = {
  checkAvailability: tool({
    description: "Check availability for specific dates",
    inputSchema: z.object({
      checkIn: z.string().describe("Check-in date in YYYY-MM-DD format"),
      checkOut: z.string().describe("Check-out date in YYYY-MM-DD format"),
    }),
    execute: async ({ checkIn, checkOut }) => {
      // Server-side fetch to availability API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/availability`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkIn, checkOut }),
        },
      )
      return response.json()
    },
  }),

  getBookings: tool({
    description: "Get all current bookings or filter by date range",
    inputSchema: z.object({
      from: z.string().optional().describe("Start date filter"),
      to: z.string().optional().describe("End date filter"),
    }),
    execute: async ({ from, to }) => {
      const params = new URLSearchParams()
      if (from) params.set("from", from)
      if (to) params.set("to", to)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/bookings?${params}`,
      )
      return response.json()
    },
  }),

  getPropertyInfo: tool({
    description: "Get information about Villa Bruno property",
    inputSchema: z.object({}),
    execute: async () => {
      return {
        name: "Villa Bruno",
        location: "Costa Rica",
        amenities: [
          "Pool",
          "Beautiful Views",
          "Modern Amenities",
          "WiFi",
          "Kitchen",
        ],
        capacity: "Up to 5 guests",
        languages: ["English", "Spanish", "German"],
      }
    },
  }),
}
```

#### 2.2 Update Chat API Route

**File**: [`src/app/api/chat/route.ts`](src/app/api/chat/route.ts)

- Enable tool execution in the stream
- Handle tool call responses properly
- Use `maxSteps` to allow multi-step tool calls

```typescript
const result = streamText({
  model: model,
  messages: allMessages,
  tools: bookingTools,
  maxSteps: 5, // Allow multiple tool calls
  temperature: bookingAgentConfig.temperature,
})
```

#### 2.3 Handle Tool Results in Frontend

**File**: [`src/components/better-chatbot/ChatInterface.tsx`](src/components/better-chatbot/ChatInterface.tsx)

- Parse tool call responses from the stream
- Display tool results in a user-friendly format
- Add visual indicators for tool execution

---

### Phase 3: Price Calculation Tool

#### 3.1 Create Server-Side Price Calculation

**New File**: `src/lib/tools/pricing.ts`

```typescript
import calculateTotal, {
  EXTRA_GUEST_FEE,
  MAX_EXTRA_GUESTS,
} from "@/lib/calculateTotal"
import { BOOKING_TYPE } from "@/types"

export interface PriceCalculationInput {
  basePrice: number // Base price per night
  guests: number // Number of guests (1-5)
  checkIn: string // Check-in date YYYY-MM-DD
  checkOut: string // Check-out date YYYY-MM-DD
  bookingType?: "villa" | "tour" // Default: "villa"
}

export interface PriceCalculationResult {
  priceForPeople: number
  priceWithVat: number
  total: number
  discountApplied: "none" | "10percent" | "20percent"
  discountAmount: number
  nights: number
  breakdown: {
    basePrice: number
    extraGuestFee: number
    vatAmount: number
    discountAmount: number
  }
}

export function calculateBookingPrice(
  input: PriceCalculationInput,
): PriceCalculationResult {
  const { basePrice, guests, checkIn, checkOut, bookingType = "villa" } = input

  // Calculate nights
  const start = new Date(checkIn)
  const end = new Date(checkOut)
  const nights = Math.ceil(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  )

  // Use existing calculation
  const { priceForPeople, priceWithVat, total } = calculateTotal(
    basePrice,
    guests,
    bookingType as any,
    nights,
  )

  // Calculate discount
  let discountApplied: "none" | "10percent" | "20percent" = "none"
  let discountAmount = 0

  if (bookingType === "villa" && nights >= 28) {
    discountApplied = "20percent"
    discountAmount = priceWithVat * nights * 0.2
  } else if (bookingType === "villa" && nights >= 7) {
    discountApplied = "10percent"
    discountAmount = priceWithVat * nights * 0.1
  }

  // Calculate breakdown
  const extraGuestFee = Math.min(guests - 1, MAX_EXTRA_GUESTS) * EXTRA_GUEST_FEE
  const vatAmount = priceForPeople * 0.13

  return {
    priceForPeople,
    priceWithVat,
    total,
    discountApplied,
    discountAmount,
    nights,
    breakdown: {
      basePrice: basePrice / 1.13, // Price without VAT
      extraGuestFee,
      vatAmount,
      discountAmount,
    },
  }
}
```

#### 3.2 Add Price Calculation Tool to config.ts

**File**: [`src/lib/better-chatbot/config.ts`](src/lib/better-chatbot/config.ts:52)

```typescript
import { calculateBookingPrice } from "@/lib/tools/pricing"

export const bookingTools = {
  // ... existing tools

  calculatePrice: tool({
    description:
      "Calculate the total price for a booking with detailed breakdown",
    inputSchema: z.object({
      basePrice: z.number().describe("Base price per night in USD"),
      guests: z.number().min(1).max(5).describe("Number of guests (1-5)"),
      checkIn: z.string().describe("Check-in date in YYYY-MM-DD format"),
      checkOut: z.string().describe("Check-out date in YYYY-MM-DD format"),
      bookingType: z.enum(["villa", "tour"]).optional().default("villa"),
    }),
    execute: async input => {
      return calculateBookingPrice(input)
    },
  }),
}
```

#### 3.3 Update System Prompt

**File**: [`src/lib/better-chatbot/config.ts`](src/lib/better-chatbot/config.ts:10)

Add pricing information to the system prompt:

```typescript
systemPrompt: `You are a helpful booking assistant for Villa Bruno...

## Pricing Information
- Base price: Use the calculatePrice tool to get accurate pricing
- Extra guest fee: $20/night per additional guest (up to 4 extra guests)
- Maximum capacity: 5 guests
- Discounts:
  - 7+ nights: 10% discount
  - 28+ nights: 20% discount
- All prices include 13% VAT

When users ask about pricing:
1. Always use the calculatePrice tool for accurate quotes
2. Present the breakdown clearly in markdown format
3. Mention any applicable discounts
...`
```

---

## Architecture Diagram

```mermaid
flowchart TD
    subgraph Frontend
        CI[ChatInterface.tsx]
        MD[ReactMarkdown]
    end

    subgraph API Routes
        CA[/api/chat]
        AV[/api/availability]
        BK[/api/bookings]
        IC[/api/ical/merged]
    end

    subgraph Tools Layer
        BT[bookingTools]
        CA_T[checkAvailability]
        CB_T[createBooking]
        GP_T[getPropertyInfo]
        CP_T[calculatePrice - NEW]
    end

    subgraph Pricing
        CT[calculateTotal.ts]
        PC[PriceCalculation.tsx]
    end

    subgraph Database
        SB[(Supabase)]
    end

    CI -->|User Message| CA
    CA -->|Tool Calls| BT
    BT --> CA_T
    BT --> CB_T
    BT --> GP_T
    BT --> CP_T

    CA_T -->|fetch| AV
    CB_T -->|fetch| BK
    CP_T -->|uses| CT

    AV --> SB
    BK --> SB
    IC --> SB

    CA -->|Stream Response| CI
    CI -->|Render| MD
```

---

## Files to Modify

| File                                                                                                 | Changes                                                 |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [`src/components/better-chatbot/ChatInterface.tsx`](src/components/better-chatbot/ChatInterface.tsx) | Add markdown rendering, handle tool results             |
| [`src/lib/better-chatbot/config.ts`](src/lib/better-chatbot/config.ts)                               | Add execute functions to tools, add calculatePrice tool |
| [`src/app/api/chat/route.ts`](src/app/api/chat/route.ts)                                             | Enable tool execution with maxSteps                     |
| `src/lib/tools/pricing.ts`                                                                           | NEW - Price calculation logic for tools                 |
| [`src/lib/tools/availability.ts`](src/lib/tools/availability.ts)                                     | Update for server-side execution                        |
| [`src/lib/tools/booking.ts`](src/lib/tools/booking.ts)                                               | Update for server-side execution                        |

---

## Dependencies to Add

```json
{
  "dependencies": {
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0"
  }
}
```

---

## Testing Checklist

- [ ] Markdown renders correctly (bold, italic, lists, code blocks)
- [ ] Tool calls execute and return results
- [ ] Availability checking works end-to-end
- [ ] Price calculation returns accurate breakdown
- [ ] Discounts are applied correctly (7+ nights, 28+ nights)
- [ ] Error handling for invalid inputs
- [ ] Loading states during tool execution
