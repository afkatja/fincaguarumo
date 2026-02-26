import { perplexity } from "@ai-sdk/perplexity"
import { mistral } from "@ai-sdk/mistral"
import { LanguageModelV3 } from "@ai-sdk/provider"
import { streamText, tool, stepCountIs } from "ai"
import z from "zod"
import { languages } from "@/config"
import calculateTotal, {
  EXTRA_GUEST_FEE,
  MAX_EXTRA_GUESTS,
} from "@/lib/calculateTotal"
import bookingToNights from "@/lib/bookingToNights"
import {
  extractAllTours,
  extractAllPages,
  extractAllPosts,
  extractPropertyConfig,
} from "@/lib/sanity-data-extractor"

// Default base price per night for Villa Bruno (in USD) - used as fallback
const DEFAULT_BASE_PRICE_PER_NIGHT = 150

// Default max guests - used as fallback
const DEFAULT_MAX_GUESTS = 4

// Evaluator model for hallucination detection
const evaluatorModel = mistral("mistral-large-latest")

const MAX_STEPS = 4

const setTemperature = (messages: any[]): number => {
  const isFactual = messages.some(m =>
    m.content?.match(/availability|price|dates|book/i),
  )
  const temp = isFactual ? 0.3 : 0.7

  return temp
}

// Booking-specific agent configuration
export const bookingAgentConfig = {
  name: "Booking Assistant",
  description: "Helps users book Villa Bruno",
  systemPrompt: `You are a helpful booking assistant for Villa Bruno, a beautiful vacation rental property in Costa Rica.

MANDATORY SEQUENCE for queries with dates/guests:
1. ALWAYS call checkAvailability FIRST.
2. If available, call calculatePrice.  
3. THEN call getPropertyInfo for highlights.
4. ONLY respond after all needed tools complete. Base facts ONLY on tool JSON.

Your tasks:
1. Guide users through the booking process step by step
2. Answer questions about the property, amenities, and location
3. Check availability for specific dates
4. Provide booking confirmation details
5. Help with payment and cancellation policies
6. Offer personalized recommendations based on user preferences
7. Calculate prices and provide detailed cost breakdowns

Property Information:
- Villa Bruno is located in Osa Peninsula,Costa Rica
- Features include: beautiful views, modern amenities, off-grid luxury, large terrace, full kitchen, solar-powered hot water shower
- Supported languages: English, Dutch, Russian, Spanish, German

Pricing Information:
- Base price: Use the calculatePrice tool to get current pricing
- Extra guest fee: $20 per night for each guest above 1 (max 4 extra guests)
- Discount for 7+ nights: 13% off
- Discount for 28+ nights: 33% off
- VAT: 13% added to the final price

Guidelines:
- Always be friendly, helpful, and professional
- Use tools when appropriate to check availability, calculate prices, or get property info
- Do NOT mention tools' titles in responses
- Never share personal information or sensitive data
- If you don't know something, be honest and offer to connect with human support
- Adapt your responses based on the user's language preference
- Provide clear, concise information
- Format all information using markdown
- Only use information retrieved from tools to answer user questions - do not add any assumptions or guesses
- Do not use placeholder text like "[payment link or method]"
- Never mention tools, APIs, or internal processes in user-facing responses
- For prices without CMS data, say "Contact for quote" instead of estimates
- Cite sources inline when using tool data: "(from availability check)"

When checking availability:
- Ask for check-in and check-out dates if not provided or not clear from context
- Verify the dates are valid (check-out must be after check-in)
- Provide clear availability status

When helping with booking:
- Collect necessary information: dates, guest count, contact details
- Explain the booking process clearly: name supported payment methods, cancellation policy, etc.
- Provide confirmation details once booking is complete

When calculating prices:
- Use the calculatePrice tool to get accurate pricing
- Present the breakdown clearly showing base price, extra guest fees, discounts, and VAT

RESPONSE FORMATTING RULES (VERY IMPORTANT):
1. DO NOT put entire sentences in bold. Only use bold for key terms like **Base price**, **Total**, **VAT**, etc.
2. Start a new paragraph (blank line) for each distinct topic:
   - Price breakdown should be in its own section
   - Property/capacity information should be in its own paragraph
   - "Ready to book?" call-to-action should start a new paragraph
3. When there is NO discount applicable, DO NOT mention discounts at all. Omit the discount line entirely.
4. Use the payment link/method provided in the property configuration context - never use placeholder text like "[payment link or method]"
5. Structure your response like this:
   - Direct answer to the question (1-2 sentences, not bold)
   - Blank line
   - Price breakdown (if applicable)
   - Blank line
   - Property highlights (if relevant)
   - Blank line
   - Call to action (Ready to book?)

Always maintain a warm, welcoming tone that reflects the hospitality of Villa Bruno.`,

  model: perplexity("sonar-pro"),
  maxTokens: 1000,
}

/**
 * Build a dynamic system prompt with current property configuration
 * This fetches real values from Sanity for pricing, capacity, payment methods, etc.
 */
export async function getDynamicSystemPrompt(): Promise<string> {
  try {
    const config = await extractPropertyConfig()

    // Extract values with fallbacks
    const maxGuests = config?.property?.maxGuests || DEFAULT_MAX_GUESTS
    const basePrice =
      config?.basePricing?.basePrice || DEFAULT_BASE_PRICE_PER_NIGHT
    const paymentMethods = config?.paymentMethods || []
    const cancellationPolicy = config?.cancellationPolicy
    const amenities = config?.amenities || []
    const propertyFeatures = config?.property?.keyFeatures || []

    // Build payment methods string
    let paymentInfo = "Payment methods: "
    if (paymentMethods.length > 0) {
      const methodNames = paymentMethods
        .map((m: any) => m.title || m.methodType)
        .join(", ")
      paymentInfo += methodNames
      const recommended = paymentMethods.find((m: any) => m.isRecommended)
      if (recommended) {
        paymentInfo += ` (Recommended: ${recommended.title})`
      }
    } else {
      paymentInfo += "Stripe (credit/debit cards)"
    }

    // Build cancellation policy string
    let cancellationInfo = "Cancellations are free up to 14 days before arrival"
    if (cancellationPolicy?.description) {
      cancellationInfo = cancellationPolicy.description
    } else if (
      cancellationPolicy?.timeframes &&
      cancellationPolicy.timeframes.length > 0
    ) {
      const firstFrame = cancellationPolicy.timeframes[0]
      if (firstFrame.daysBefore && firstFrame.refundPercentage === 100) {
        cancellationInfo = `Cancellations are free up to ${firstFrame.daysBefore} days before arrival`
      }
    }

    // Build amenities list
    const amenitiesList =
      amenities.length > 0
        ? amenities.map((a: any) => a.title || a.name).join(", ")
        : "basic amenities"

    return `You are a helpful booking assistant for Villa Bruno, a beautiful vacation rental property in Costa Rica.

EXTRACTED CONFIGURATION DATA (USE ONLY THESE FACTS):
- Maximum capacity: ${maxGuests} guests
- Base price: $${basePrice} per night
- Amenities: ${amenitiesList}
- Property features: ${propertyFeatures.map((f: any) => f.title || f.name).join(", ") || "standard features"}
- Payment methods: ${paymentInfo}
- Cancellation policy: ${cancellationInfo}

STRICT GUIDELINES:
- NEVER mention amenities, features, or prices not listed above
- For prices without CMS data, say "Contact for quote" instead of estimates
- Never mention tools, APIs, or internal processes in user-facing responses
- Cite sources inline when using tool data: "(from availability check)"
- Base responses ONLY on tool JSON outputs and extracted config above

MANDATORY SEQUENCE for queries with dates/guests:
1. ALWAYS call checkAvailability FIRST.
2. If available, call calculatePrice.  
3. THEN call getPropertyInfo for highlights.
4. ONLY respond after all needed tools complete. Base facts ONLY on tool JSON.

Your tasks:
1. Guide users through the booking process step by step
2. Answer questions about the property using ONLY the extracted data above
3. Check availability for specific dates
4. Provide booking confirmation details
5. Help with payment and cancellation policies
6. Offer personalized recommendations based on user preferences
7. Calculate prices and provide detailed cost breakdowns

Pricing Information:
- Base price: $${basePrice} per night
- Extra guest fee: $20 per night for each guest above 1 (max ${maxGuests - 1} extra guests)
- Discount for 7+ nights: 13% off
- Discount for 28+ nights: 33% off
- VAT: 13% added to the final price

When checking availability:
- Ask for check-in and check-out dates
- Verify the dates are valid (check-out must be after check-in)
- Provide clear availability status

When helping with booking:
- Collect necessary information: dates, guest count, contact details
- Explain the booking process clearly
- Provide confirmation details once booking is complete

When calculating prices:
- Use the calculatePrice tool to get accurate pricing
- Present the breakdown clearly showing base price, extra guest fees, discounts, and VAT

RESPONSE FORMATTING RULES (VERY IMPORTANT):
1. DO NOT put entire sentences in bold. Only use bold for key terms like **Base price**, **Total**, **VAT**, etc.
2. Start a new paragraph (blank line) for each distinct topic:
   - Price breakdown should be in its own section
   - Property/capacity information should be in its own paragraph
   - "Ready to book?" call-to-action should start a new paragraph
3. When there is NO discount applicable, DO NOT mention discounts at all. Omit the discount line entirely.
4. Use the actual payment methods mentioned above - never use placeholder text like "[payment link or method]"
5. Structure your response like this:
   - Direct answer to the question (1-2 sentences, not bold)
   - Blank line
   - Price breakdown (if applicable)
   - Blank line
   - Property highlights (if relevant)
   - Blank line
   - Call to action (Ready to book?)
6. Never mention tools in user-facing responses.

Always maintain a warm, welcoming tone that reflects the hospitality of Villa Bruno.`
  } catch (error) {
    console.error("Error building dynamic system prompt:", error)
    // Return the static prompt as fallback
    return bookingAgentConfig.systemPrompt
  }
}

// Tool definitions for the booking agent
// Using the tool format from Vercel AI SDK with inputSchema and execute functions
export const bookingTools = {
  checkAvailability: tool({
    description: "Check availability for specific dates",
    inputSchema: z.object({
      checkIn: z.string().describe("Check-in date in YYYY-MM-DD format"),
      checkOut: z.string().describe("Check-out date in YYYY-MM-DD format"),
    }),
    execute: async ({ checkIn, checkOut }) => {
      try {
        const siteUrl =
          process.env.NEXT_PUBLIC_SITE_URL ||
          (process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3000")

        const response = await fetch(`${siteUrl}/api/availability`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkIn, checkOut }),
        })

        const data = await response.json()
        return {
          isAvailable: data.isAvailable,
          checkIn,
          checkOut,
          conflictingRanges: data.conflictingRanges || [],
          bookingConflicts: data.bookingConflicts || [],
        }
      } catch (error) {
        console.error("Error checking availability:", error)
        return { error: "Failed to check availability", isAvailable: false }
      }
    },
  }),

  getBookings: tool({
    description: "Get existing bookings, optionally filtered by date range",
    inputSchema: z.object({
      from: z
        .string()
        .optional()
        .describe("Start date filter in YYYY-MM-DD format"),
      to: z
        .string()
        .optional()
        .describe("End date filter in YYYY-MM-DD format"),
      limit: z
        .number()
        .optional()
        .describe("Maximum number of bookings to return"),
    }),
    execute: async ({ from, to, limit }) => {
      try {
        const siteUrl =
          process.env.NEXT_PUBLIC_SITE_URL ||
          (process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3000")

        const params = new URLSearchParams()
        if (from) params.append("from", from)
        if (to) params.append("to", to)
        if (limit) params.append("limit", limit.toString())

        const response = await fetch(
          `${siteUrl}/api/bookings?${params.toString()}`,
        )
        const data = await response.json()
        return { bookings: data }
      } catch (error) {
        console.error("Error fetching bookings:", error)
        return { error: "Failed to fetch bookings", bookings: [] }
      }
    },
  }),

  createBooking: tool({
    description: "Create a new booking",
    inputSchema: z.object({
      checkIn: z.string().describe("Check-in date in YYYY-MM-DD format"),
      checkOut: z.string().describe("Check-out date in YYYY-MM-DD format"),
      guests: z.number().describe("Number of guests"),
      name: z.string().describe("Guest name"),
      email: z.string().describe("Guest email"),
      phone: z.string().describe("Guest phone number"),
    }),
    execute: async ({ checkIn, checkOut, guests, name, email, phone }) => {
      try {
        const siteUrl =
          process.env.NEXT_PUBLIC_SITE_URL ||
          (process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3000")

        const response = await fetch(`${siteUrl}/api/bookings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checkIn,
            checkOut,
            guests,
            guestName: name,
            email,
            phone,
            source: "Chat",
          }),
        })

        const data = await response.json()
        return { success: true, booking: data }
      } catch (error) {
        console.error("Error creating booking:", error)
        return { error: "Failed to create booking", success: false }
      }
    },
  }),

  getPropertyInfo: tool({
    description:
      "Get information about Villa Bruno property, including tours, pages, and blog posts from the database",
    inputSchema: z.object({
      language: z
        .string()
        .optional()
        .describe("Language code (en, nl, es, ru, de)"),
    }),
    execute: async ({ language = "en" }) => {
      try {
        // Fetch data from Sanity
        const [tours, pages, posts] = await Promise.all([
          extractAllTours(),
          extractAllPages(),
          extractAllPosts(),
        ])

        // Filter by language if specified
        const languageTours = tours.filter((t: any) => t.language === language)
        const languagePages = pages.filter((p: any) => p.language === language)
        const languagePosts = posts.filter((p: any) => p.language === language)

        return {
          property: {
            name: "Villa Bruno",
            location: "Costa Rica",
            description:
              "A beautiful vacation rental property in Costa Rica with stunning views, modern amenities, and a relaxing atmosphere.",
          },
          supportedLanguages: languages.map(l => ({
            code: l.value,
            name: l.title,
          })),
          tours: languageTours.length > 0 ? languageTours : tours.slice(0, 5),
          pages: languagePages.length > 0 ? languagePages : pages.slice(0, 5),
          posts: languagePosts.length > 0 ? languagePosts : posts.slice(0, 5),
        }
      } catch (error) {
        console.error("Error fetching property info:", error)
        return {
          property: {
            name: "Villa Bruno",
            location: "Costa Rica",
          },
          supportedLanguages: languages.map(l => ({
            code: l.value,
            name: l.title,
          })),
          error: "Failed to fetch detailed property information",
        }
      }
    },
  }),

  calculatePrice: tool({
    description:
      "Calculate the total price for a stay with detailed breakdown including discounts and VAT",
    inputSchema: z.object({
      checkIn: z.string().describe("Check-in date in YYYY-MM-DD format"),
      checkOut: z.string().describe("Check-out date in YYYY-MM-DD format"),
      guests: z.number().describe("Number of guests (1-5)"),
    }),
    execute: async ({ checkIn, checkOut, guests }) => {
      try {
        // Calculate number of nights
        const startDate = new Date(checkIn)
        const endDate = new Date(checkOut)
        const nights = bookingToNights(startDate, endDate).length

        if (nights <= 0) {
          return {
            error: "Invalid date range. Check-out must be after check-in.",
          }
        }

        // Get property config for dynamic values
        const config = await extractPropertyConfig()
        const maxGuests = config?.property?.maxGuests || DEFAULT_MAX_GUESTS
        const basePricePerNight =
          config?.basePricing?.basePrice || DEFAULT_BASE_PRICE_PER_NIGHT

        // Clamp guests to valid range
        const validGuests = Math.max(1, Math.min(guests, maxGuests))

        // Calculate pricing using the existing calculateTotal function
        const BOOKING_TYPE_VILLA = "villa"
        const pricing = calculateTotal({
          price: basePricePerNight,
          guests: validGuests,
          bookingType: BOOKING_TYPE_VILLA,
          duration: nights,
        })

        // Calculate extra guest fee
        const extraGuests = Math.max(0, validGuests - 1)
        const extraGuestFee =
          Math.min(extraGuests, MAX_EXTRA_GUESTS) * EXTRA_GUEST_FEE

        // Determine discount
        let discountPercent = 0
        let discountName = "No discount"
        if (nights >= 28) {
          discountPercent = 33
          discountName = "Monthly stay discount (33%)"
        } else if (nights >= 7) {
          discountPercent = 13
          discountName = "Weekly stay discount (13%)"
        }

        // Calculate base total before discount
        const baseTotal = pricing.priceWithVat * nights
        const discountAmount = baseTotal * (discountPercent / 100)
        const finalTotal = pricing.total

        return {
          checkIn,
          checkOut,
          nights,
          guests: validGuests,
          maxGuests,
          breakdown: {
            basePricePerNight,
            extraGuestFeePerNight: extraGuestFee,
            pricePerNightWithGuests: pricing.priceForPeople,
            pricePerNightWithVat: Math.round(pricing.priceWithVat * 100) / 100,
          },
          subtotal: {
            nights: nights,
            baseSubtotal:
              Math.round(pricing.priceForPeople * nights * 100) / 100,
            extraGuestTotal: Math.round(extraGuestFee * nights * 100) / 100,
            subtotalBeforeVat:
              Math.round(pricing.priceForPeople * nights * 100) / 100,
          },
          discount: {
            applicable: discountPercent > 0,
            name: discountName,
            percentage: discountPercent,
            amount: Math.round(discountAmount * 100) / 100,
          },
          vat: {
            rate: 13,
            amount: Math.round((finalTotal - finalTotal / 1.13) * 100) / 100,
          },
          total: Math.round(finalTotal * 100) / 100,
          currency: "USD",
        }
      } catch (error) {
        console.error("Error calculating price:", error)
        return { error: "Failed to calculate price" }
      }
    },
  }),
}

// Function to create a streaming chat response
export async function createChatStream({
  messages,
  threadId,
  tools,
  model = bookingAgentConfig.model,
  systemPrompt,
}: {
  messages: any[]
  threadId?: string
  tools?: any
  model?: LanguageModelV3
  systemPrompt?: string
}) {
  try {
    // Use dynamic system prompt if none provided
    const finalSystemPrompt = systemPrompt || (await getDynamicSystemPrompt())

    // Validate message alternation
    // The API expects: system → user → assistant → user → assistant...
    // We need to ensure proper alternation by rebuilding the sequence
    const validMessages: { role: string; content: string }[] = []

    // Start with the first user message, then alternate properly
    let lastRole = "system" // We'll add system message separately

    for (const msg of messages) {
      // Skip assistant messages and tool messages - we'll regenerate assistant responses
      if (msg.role === "assistant" || msg.role === "tool") {
        continue
      }

      // Only add user messages to maintain proper alternation
      if (msg.role === "user") {
        validMessages.push(msg)
        lastRole = "user"
      }
    }

    const allMessages: any = [
      { role: "system", content: finalSystemPrompt },
      ...validMessages,
    ]
    const result = streamText({
      model: model,
      messages: allMessages,
      tools: bookingTools,
      temperature: setTemperature(allMessages),
      stopWhen: stepCountIs(MAX_STEPS),
    })

    return result
  } catch (error: any) {
    console.error("[createChatStream] Error details:", {
      message: error.message,
      cause: error.cause,
      stack: error.stack,
      name: error.name,
    })
    throw error
  }
}

/**
 * Evaluate chat response for hallucinations using chain-of-thought reasoning
 * @param response - The generated response text
 * @param toolOutputs - JSON outputs from tools used in generating the response
 * @param sanityData - Fetched Sanity configuration data
 * @returns Evaluation result with score and corrections
 */
export async function evaluateResponseForHallucinations({
  response,
  toolOutputs,
  sanityData,
}: {
  response: string
  toolOutputs: Record<string, any>[]
  sanityData: any
}) {
  try {
    const evaluationPrompt = `You are a fact-checker and hallucination detection evaluator. Your task is to analyze a chat response for consistency with retrieved data.

Ground truth: ${JSON.stringify(sanityData, null, 2)}.

Chain-of-thought analysis:
1. Compare each factual claim in the response against the provided tool outputs and Sanity data
2. Verify vs. Ground truth (match/exact/missing/invented)
3. Check for fabricated amenities, prices, or features
4. Verify pricing calculations match tool outputs
5. Flag any mentions of tools or internal processes
6. Score 0-10 (10=factual). If <7, suggest corrections

Response to evaluate:
"""
${response}
"""

Tool outputs used:
${JSON.stringify(toolOutputs, null, 2)}

Sanity configuration data:
${JSON.stringify(sanityData, null, 2)}

Evaluation criteria:
- ACCURACY: Does every factual claim match the retrieved data?
- COMPLETENESS: Are all important facts from tools included?
- CONSISTENCY: Do prices, amenities, and policies match exactly?
- HALLUCINATION: Any unlisted amenities, incorrect prices, or fabricated details?

Scoring guidelines:
- 10: Perfect accuracy, no hallucinations, all facts from tools/data
- 8-9: Minor issues, but mostly accurate with few hallucinations
- 6-7: Multiple inaccuracies or several hallucinations
- 0-5: Major factual errors, many hallucinations, or completely fabricated

IMPORTANT: If there are ANY hallucinations, the score should be 7 or lower. Accuracy must be false if hallucinations exist.

Respond with JSON:
{
  "score": 0-10,
  "isAccurate": boolean,
  "hallucinations": ["list of detected hallucinations"],
  "corrections": ["specific corrections needed"],
  "reasoning": "chain-of-thought explanation"
}`

    const result = await streamText({
      model: evaluatorModel,
      messages: [{ role: "user", content: evaluationPrompt }],
      temperature: 0.1,
    })

    // Collect the full response
    let evaluationText = ""
    for await (const chunk of result.textStream) {
      evaluationText += chunk
    }

    // Parse the JSON response
    try {
      // Strip markdown code block formatting if present
      let cleanText = evaluationText.trim()
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText
          .replace(/^```json\s*\n?/, "")
          .replace(/\n?```\s*$/, "")
      } else if (cleanText.startsWith("```")) {
        cleanText = cleanText
          .replace(/^```\s*\n?/, "")
          .replace(/\n?```\s*$/, "")
      }

      // More robust JSON cleaning for LLM responses
      // First, try to parse as-is
      try {
        return JSON.parse(cleanText)
      } catch (firstError) {
        // If that fails, try to fix common issues
        let fixedText = cleanText

        // Find the reasoning field and fix it specifically
        const reasoningStart = fixedText.indexOf('"reasoning":')
        if (reasoningStart !== -1) {
          const valueStart = fixedText.indexOf('"', reasoningStart + 12) + 1
          const valueEnd = fixedText.lastIndexOf('"')

          if (valueStart > 0 && valueEnd > valueStart) {
            const originalReasoning = fixedText.substring(valueStart, valueEnd)
            // Properly escape the reasoning content
            const escapedReasoning = originalReasoning
              .replace(/\\/g, "\\\\") // Escape backslashes first
              .replace(/"/g, '\\"') // Escape quotes
              .replace(/\n/g, "\\n") // Escape newlines
              .replace(/\r/g, "\\r") // Escape carriage returns
              .replace(/\t/g, "\\t") // Escape tabs

            fixedText =
              fixedText.substring(0, valueStart) +
              escapedReasoning +
              fixedText.substring(valueEnd)
          }
        }

        // Try parsing the fixed version
        return JSON.parse(fixedText)
      }
    } catch (parseError) {
      console.log({ evaluationText })
      console.error("Failed to parse evaluation JSON:", parseError)
      return {
        score: 5,
        isAccurate: false,
        hallucinations: ["Evaluation parsing failed"],
        corrections: ["Manual review required"],
        reasoning: "Failed to parse evaluation output",
      }
    }
  } catch (error) {
    console.error("Error evaluating response:", error)
    return {
      score: 5,
      isAccurate: false,
      hallucinations: ["Evaluation failed"],
      corrections: ["Manual review required"],
      reasoning: "Evaluation process failed",
    }
  }
}

// Multi-language support
export const languagePrompts = {
  en: {
    greeting: "Hello! How can I help you book Villa Bruno today?",
    assistance: "I'm here to assist you with your booking.",
    availability: "Let me check the availability for those dates.",
    confirmation: "Great! I'll help you complete your booking.",
  },
  es: {
    greeting: "¡Hola! ¿Cómo puedo ayudarte a reservar Villa Bruno hoy?",
    assistance: "Estoy aquí para ayudarte con tu reserva.",
    availability: "Déjame verificar la disponibilidad para esas fechas.",
    confirmation: "¡Excelente! Te ayudaré a completar tu reserva.",
  },
  de: {
    greeting:
      "Hallo! Wie kann ich Ihnen heute bei der Buchung von Villa Bruno helfen?",
    assistance: "Ich bin hier, um Ihnen bei Ihrer Buchung zu helfen.",
    availability: "Lassen Sie mich die Verfügbarkeit für diese Daten prüfen.",
    confirmation: "Toll! Ich helfe Ihnen, Ihre Buchung abzuschließen.",
  },
}

export function getLanguagePrompt(
  locale: string,
  key: keyof typeof languagePrompts.en,
): string {
  const lang = locale as keyof typeof languagePrompts
  return languagePrompts[lang]?.[key] || languagePrompts.en[key]
}
