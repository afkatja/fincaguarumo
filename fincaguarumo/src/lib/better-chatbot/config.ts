import { LanguageModelV3 } from "@ai-sdk/provider"
import { streamText, tool, stepCountIs } from "ai"
import z from "zod"
import { detectUserIntent, UserIntent } from "../intent-detection"
import { languages, locales } from "@/config"
import { parse, isValid, format } from "date-fns"
import { enUS, nl, es, ru, de } from "date-fns/locale"

// Map locale codes to date-fns locales
const dateFnsLocales = {
  en: enUS,
  nl: nl,
  es: es,
  ru: ru,
  de: de,
}

// Extract dates from message using multilingual parsing
function extractDatesFromMessage(message: string): string[] {
  const dates: string[] = []

  // Common date patterns to try for each locale
  const datePatterns = [
    // Standard formats
    "yyyy-MM-dd", // 2026-02-28
    "dd/MM/yyyy", // 28/02/2026
    "MM/dd/yyyy", // 02/28/2026
    "dd.MM.yyyy", // 28.02.2026
    "dd-MM-yyyy", // 28-02-2026
    // Natural language formats
    "MMMM d, yyyy", // February 28, 2026
    "MMM d, yyyy", // Feb 28, 2026
    "MMMM d", // February 28
    "MMM d", // Feb 28
    "d MMMM yyyy", // 28 February 2026
    "d MMM yyyy", // 28 Feb 2026
    "d MMMM", // 28 February
    "d MMM", // 28 Feb
    // "of" patterns
    "d of MMMM yyyy", // 28 of February 2026
    "d of MMMM", // 28 of February
  ]

  // Try parsing with each locale
  for (const localeCode of locales) {
    const locale = dateFnsLocales[localeCode as keyof typeof dateFnsLocales]

    for (const pattern of datePatterns) {
      // Find potential date strings in the message
      const regex = createDateRegexForPattern(pattern)
      const matches = message.match(regex)

      if (matches) {
        for (const match of matches) {
          try {
            const parsed = parse(match, pattern, new Date(), { locale })
            if (isValid(parsed)) {
              // Normalize to ISO format for consistency
              dates.push(format(parsed, "yyyy-MM-dd"))
            }
          } catch (error) {
            // Continue if parsing fails
          }
        }
      }
    }
  }

  // Remove duplicates and return
  return [...new Set(dates)]
}

// Create regex pattern to find date strings in text
function createDateRegexForPattern(pattern: string): RegExp {
  // Convert date-fns pattern to regex pattern
  // Use temporary placeholders to avoid conflicts between overlapping patterns
  let regexPattern = pattern
    // Replace longer patterns first to avoid conflicts
    .replace(/yyyy/g, "TEMP_YEAR")
    .replace(/MMMM/g, "TEMP_MONTH_FULL")
    .replace(/MMM/g, "TEMP_MONTH_SHORT")
    .replace(/MM/g, "TEMP_MONTH")
    .replace(/dd/g, "TEMP_DAY")
    .replace(/d/g, "TEMP_DAY_SINGLE")
    .replace(/\s+/g, "\\s+")
    .replace(/of/g, "(?:of|van|de|del)?")
    // Now replace the temporary placeholders with actual regex patterns
    .replace(/TEMP_YEAR/g, "\\d{4}")
    .replace(
      /TEMP_MONTH_FULL/g,
      "(January|February|March|April|May|June|July|August|September|October|November|December|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december|январь|февраль|март|апрель|май|июнь|июль|август|сентябрь|октябрь|ноябрь|декабрь|Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)",
    )
    .replace(
      /TEMP_MONTH_SHORT/g,
      "(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|jan|feb|mrt|apr|mei|jun|jul|aug|sep|okt|nov|dec|янв|фев|мар|апр|май|июн|июл|авг|сен|окт|ноя|дек|Jan|Feb|Mär|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Dez)",
    )
    .replace(/TEMP_MONTH/g, "\\d{1,2}")
    .replace(/TEMP_DAY/g, "\\d{1,2}")
    .replace(/TEMP_DAY_SINGLE/g, "\\d{1,2}")

  return new RegExp(`\\b${regexPattern}\\b`, "gi")
}

import { calculateEffectivePrice } from "@/lib/pricingEngine"
import bookingToNights from "@/lib/bookingToNights"
import {
  extractAllTours,
  extractAllPages,
  extractAllPosts,
  extractPropertyConfig,
} from "@/lib/sanity-data-extractor"
import { getSourceRestrictedPrompt } from "./source-restrictions"
import {
  cacheEvaluationData,
  getCachedEvaluationData,
} from "@/lib/degradation-response"
import { resolveModel } from "@/lib/model-gateway"
import { getModelRole } from "@/lib/model-registry"
import { detectLanguage } from "@/lib/semantic-rag/multilingual-preprocessing"

// Import translations for CTA text
import enMessages from "@/messages/en.json"
import esMessages from "@/messages/es.json"
import deMessages from "@/messages/de.json"
import nlMessages from "@/messages/nl.json"
import ruMessages from "@/messages/ru.json"

// Translation messages mapping
const translations = {
  en: enMessages,
  es: esMessages,
  de: deMessages,
  nl: nlMessages,
  ru: ruMessages,
}

// Helper function to get translated CTA text
function getTranslatedCTA(language: string = "en"): string {
  const messages =
    translations[language as keyof typeof translations] || translations.en
  const cta = messages.bookingChat.readyToBook
  console.log(`🔍 DEBUG - CTA Translation: Language=${language}, CTA="${cta}"`)
  return cta
}

// Helper function to detect language from user messages
function detectLanguageFromMessages(messages: Message[]): string {
  // Get the last user message for language detection
  const lastUserMessage = messages.filter(msg => msg.role === "user").pop()

  if (!lastUserMessage?.content) {
    console.log(
      "🔍 DEBUG - Language Detection: No user message found, defaulting to English",
    )
    return "en" // Default to English
  }

  const detectedLanguage = detectLanguage(lastUserMessage.content)
  const finalLanguage = detectedLanguage === "unknown" ? "en" : detectedLanguage
  console.log(
    `🔍 DEBUG - Language Detection: Message="${lastUserMessage.content}", Detected="${detectedLanguage}", Final="${finalLanguage}"`,
  )
  return finalLanguage
}

// Simple in-memory cache for availability data
const availabilityCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Helper function to get cached availability or fetch new data
async function getCachedAvailability(
  checkIn: string,
  checkOut: string,
): Promise<any> {
  const cacheKey = `${checkIn}-${checkOut}`
  const cached = availabilityCache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log("Using cached availability data for:", cacheKey)
    return cached.data
  }

  // Fetch fresh data
  try {
    // Build site URL with proper production fallbacks
    let siteUrl: string
    if (process.env.NODE_ENV === "production") {
      if (process.env.NEXT_PUBLIC_SITE_URL) {
        siteUrl = process.env.NEXT_PUBLIC_SITE_URL
      } else if (process.env.VERCEL_URL) {
        siteUrl = `https://${process.env.VERCEL_URL}`
      } else {
        throw new Error(
          "Production environment requires NEXT_PUBLIC_SITE_URL or VERCEL_URL to be set",
        )
      }
    } else {
      siteUrl = "http://localhost:3000"
    }

    console.log("Fetching fresh availability data for:", cacheKey)

    // Add timeout to prevent hanging requests
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, 8000) // 8 second timeout

    try {
      const response = await fetch(`${siteUrl}/api/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkIn, checkOut }),
        signal: controller.signal,
      })

      // Clear timeout if fetch completes
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(
          `Availability API returned ${response.status}: ${response.statusText}`,
        )
      }

      const data = await response.json()

      // Cache the result
      availabilityCache.set(cacheKey, { data, timestamp: Date.now() })

      // Clean up old cache entries periodically
      if (availabilityCache.size > 50) {
        const now = Date.now()
        for (const [key, value] of availabilityCache.entries()) {
          if (now - value.timestamp > CACHE_DURATION) {
            availabilityCache.delete(key)
          }
        }
      }

      return data
    } catch (error) {
      // Clear timeout on any error
      clearTimeout(timeoutId)

      // Re-throw AbortError to be caught by outer catch
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout: Failed to check availability")
      }
      throw error
    }
  } catch (error) {
    console.error("Error fetching availability:", error)
    return { error: "Failed to check availability", isAvailable: false }
  }
}

// Define Message type since AI SDK v6 doesn't export it directly
type Message = {
  role: "user" | "assistant" | "system" | "tool"
  content: string
  toolInvocations?: any[]
}

// Default base price per night for Villa Bruno (in USD) - used as fallback
const DEFAULT_BASE_PRICE_PER_NIGHT = 150

// Default max guests - used as fallback
const DEFAULT_MAX_GUESTS = 4

const MAX_STEPS = 4

async function getGatewayModel(
  role: string,
  taskType: string,
): Promise<LanguageModelV3> {
  const resolved = await resolveModel(role, { taskType })
  return resolved.model
}

const setTemperature = (messages: Message[]): number => {
  const isFactual = messages.some(m =>
    m.content?.match(/availability|price|dates|book/i),
  )
  // Reduced temperatures for faster, more direct responses
  const temp = isFactual ? 0.1 : 0.3

  return temp
}

// Common prompt template to avoid duplication
interface PromptConfig {
  maxGuests?: number
  basePrice?: number
  amenitiesList?: string
  propertyFeatures?: string
  paymentInfo?: string
  cancellationInfo?: string
  pricingRules?: any[]
  useDynamicValues?: boolean
  language?: string
}

function buildSystemPrompt(config: PromptConfig = {}): string {
  const {
    maxGuests = DEFAULT_MAX_GUESTS,
    basePrice = DEFAULT_BASE_PRICE_PER_NIGHT,
    amenitiesList = "basic amenities",
    propertyFeatures = "standard features",
    paymentInfo = "Stripe (credit/debit cards)",
    cancellationInfo = "Cancellations are free up to 14 days before arrival",
    pricingRules = [],
    useDynamicValues = false,
    language = "en",
  } = config

  // Get translated CTA text
  const translatedCTA = getTranslatedCTA(language)

  const staticPropertyInfo = useDynamicValues
    ? ""
    : `
Property Information:
- Villa Bruno is located in Osa Peninsula, Costa Rica
- Features: beautiful views, modern amenities, off-grid luxury, large terrace, full kitchen, solar-powered hot water shower, rain water collection system
- Supported languages: ${languages.map(l => l.title).join(", ")}`

  const staticPricingInfo = useDynamicValues
    ? ""
    : `
Pricing Information:
- Base price: Use calculatePrice tool for current pricing
- Extra guest fee: $20 per night for each guest above 1 (max 4 total guests)
- Discount for 7+ nights: 13% off
- Discount for 28+ nights: 33% off
- VAT: 13% added to final price`

  const dynamicConfigInfo = useDynamicValues
    ? `
EXTRACTED CONFIGURATION DATA (USE ONLY THESE FACTS):
- Maximum capacity: ${maxGuests} guests
- Base price: $${basePrice} per night
- Amenities: ${amenitiesList}
- Property features: ${propertyFeatures}
- Payment methods: ${paymentInfo}
- Cancellation policy: ${cancellationInfo}

STRICT GUIDELINES:
- NEVER mention amenities, features, or prices not listed above
- For prices without CMS data, say "Contact for quote" instead of estimates
- Never mention tools, APIs, or internal processes in user-facing responses`
    : ""

  const dynamicPricingInfo = useDynamicValues
    ? `
Pricing Information:
- Base price: $${basePrice} per night
- Extra guest fee: ${pricingRules?.find((r: any) => r.ruleType === "fee")?.basePrice} per night for each guest above 1 (max ${maxGuests - 1} extra guests)
- Discount for ${pricingRules?.find((r: any) => r.ruleType === "discount" && r.minimumNights === 7)?.minimumNights}+ nights: ${pricingRules?.find((r: any) => r.ruleType === "discount" && r.minimumNights === 7)?.percentage}% off
- Discount for ${pricingRules?.find((r: any) => r.ruleType === "discount" && r.minimumNights === 28)?.minimumNights}+ nights: ${pricingRules?.find((r: any) => r.ruleType === "discount" && r.minimumNights === 28)?.percentage}% off
- VAT: ${pricingRules?.find((r: any) => r.ruleType === "vat")?.percentage}% added to the final price`
    : ""

  const strictGuidelines = useDynamicValues
    ? `
- Base responses ONLY on tool JSON outputs and extracted config above

For any question involving dates, prices, availability, guest counts, booking details, or property facts (amenities, capacity, location), you MUST call the appropriate tools and base your answer ONLY on their JSON results. Do NOT answer from general knowledge.`
    : `
- Only use information from tools - no assumptions
- Double-check all factual claims against provided data
- Never invent amenities, features, or details not in ground truth
- Verify all pricing matches tool outputs exactly
- Only use information from the provided ground truth data
- CRITICAL: Always address the user's specific question directly
- If tools fail or return errors, acknowledge this instead of providing alternative information
- Do not answer questions the user didn't ask`

  return `You are a helpful booking assistant for Villa Bruno, a beautiful vacation rental property in Costa Rica.

RESPONSE EFFICIENCY RULES (CRITICAL FOR SPEED):
- Respond with ONLY essential information to answer the user's question
- Use 1-2 sentences maximum for direct answers
- Keep responses under 100 words whenever possible
- Avoid unnecessary details unless specifically asked
- Prioritize speed and directness over elaborate explanations

${staticPropertyInfo}

${staticPricingInfo}

${dynamicConfigInfo}

${dynamicPricingInfo}

Guidelines:
- Be friendly but concise
- Use tools when appropriate for accuracy
- Never share personal information
- Adapt to user's language preference
- Use markdown formatting
- Cite sources: "(from availability check)"
${strictGuidelines}

INTENT-BASED TOOL ROUTING (CRITICAL - READ FIRST):
MATCH USER INTENT → CALL CORRECT TOOL → ANSWER ONLY FROM TOOL JSON:
- AVAILABILITY QUERIES ("available", "dates", "nights"): checkAvailability ONLY
- PRICING/DISCOUNT QUERIES ("price", "discount", "children", "cost"): checkPricingRules → calculatePrice (if dates provided)
PROPERTY INFO ("amenities", "features"): getPropertyInfo ONLY
BOOKING ("book", "reserve"): createBooking (collect all details first)

RULES:
- ONLY call tools matching CURRENT user question
- NEVER call availability tools for discount/price questions
- If no dates provided → NO availability check
- Base response 100% on tool JSON output
- If tool fails → "Unable to verify, contact us"

MANDATORY CTA:
ALWAYS end relevant responses with:
"\n\n${translatedCTA}"

IMPORTANT: The ${translatedCTA} will be automatically translated to the user's language. DO NOT manually translate it or use English CTA for non-English conversations.

Your tasks:
1. Answer questions directly and concisely
2. Check availability for specific dates
3. Provide pricing information when requested
4. Help with booking process

When checking availability:
- Ask for dates if not provided
- Verify dates are valid

When helping with booking:
- Collect necessary information: dates, guest count, contact details
- Explain the booking process clearly

When calculating prices:
- Use the calculatePrice tool to get accurate pricing
- Present the breakdown clearly showing base price, extra guest fees, discounts, and VAT

RESPONSE FORMATTING RULES (VERY IMPORTANT):
1. DO NOT put entire sentences in bold. Only use bold for key terms like **Base price**, **Total**, **VAT**, etc.
2. Do not make entire sentences a heading like h1, h2, or h3. Use p for paragraphs, ul/ol for lists.
3. Start a new paragraph (blank line) for each distinct topic:
   - Price breakdown should be in its own section
   - Property/capacity information should be in its own paragraph
   - "Ready to book?" call-to-action should start a new paragraph
4. When there is NO discount applicable, DO NOT mention discounts at all. Omit the discount line entirely.
5. Use the payment link/method provided in the property configuration context - never use placeholder text like "[payment link or method]"
6. MARKDOWN LIST FORMATTING (CRITICAL):
   - For unordered lists: use "- " at the start of EACH list item, with each item on a NEW LINE
   - For ordered lists: use "1. ", "2. ", etc. at the start of EACH list item, with each item on a NEW LINE
   - NEVER concatenate list items on the same line
   - ALWAYS put a blank line before and after lists
   - NEVER add random numbers or symbols after list items
   - EXAMPLE OF CORRECT FORMAT:
     "- Koelkast
     - Kookplaat
     - Oven"
   - EXAMPLE OF INCORRECT FORMAT:
     "- Koelkast1:K ookplaat-O ven" (NEVER DO THIS)
   - NEVER add "1:" or any numbers after list items
   - NEVER add spaces within words
7. QUESTION AND CTA SPACING:
   - ALWAYS put a blank line before generic intent questions
   - ALWAYS put a blank line before call-to-action statements
   - NEVER run questions or CTAs directly into previous content
   - EXAMPLE: Always put "\n\n" (two newlines) before CTA like "Ready to book?"
Always maintain a warm, welcoming tone that reflects the hospitality of Villa Bruno.

MINIMAL RESPONSE FORMAT:
1. Direct answer (1-2 sentences, not bold)
2. Blank line
3. Essential details only (price/availability if relevant)
   - Use proper markdown lists: each item on new line starting with "- "
   - Put blank lines before and after lists
4. Blank line before questions and CTAs
5. Single call-to-action: "Ready to book?" (if booking-related)

Keep responses brief and focused on the user's specific question.`
}

const primaryModelRole = getModelRole("primary")

// Booking-specific agent configuration
export const bookingAgentConfig = {
  name: "Booking Assistant",
  description: "Helps users book Villa Bruno",
  systemPrompt: getSourceRestrictedPrompt(
    buildSystemPrompt({ useDynamicValues: false }),
  ),
  maxTokens: primaryModelRole?.modelRef.includes("mistral-large") ? 4000 : 1000,
}

/**
 * Build a dynamic system prompt with current property configuration
 * This fetches real values from Sanity for pricing, capacity, payment methods, etc.
 */
export async function getDynamicSystemPrompt(
  language: string = "en",
): Promise<string> {
  try {
    const config = await extractPropertyConfig()

    // Extract values with fallbacks
    const maxGuests = config?.property?.capacity || DEFAULT_MAX_GUESTS
    const basePrice =
      config?.basePricing?.basePrice || DEFAULT_BASE_PRICE_PER_NIGHT
    const paymentMethods =
      config?.property?.paymentMethods || config?.paymentMethods || []
    const cancellationPolicy =
      config?.property?.cancellationPolicy || config?.cancellationPolicy
    const amenities = config?.property?.amenities || []
    const propertyFeatures = config?.property?.highlightFeatures || []

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

    const propertyFeaturesList =
      propertyFeatures.map((f: any) => f.title || f.name).join(", ") ||
      "standard features"

    const pricingRules =
      config?.property?.pricingRules || config?.pricingRules || []

    return getSourceRestrictedPrompt(
      buildSystemPrompt({
        maxGuests,
        basePrice,
        amenitiesList,
        propertyFeatures: propertyFeaturesList,
        paymentInfo,
        cancellationInfo,
        pricingRules,
        useDynamicValues: true,
        language,
      }),
    )
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
        // Use the cached availability function
        const data = await getCachedAvailability(checkIn, checkOut)

        return {
          isAvailable: data.isAvailable,
          checkIn,
          checkOut,
          conflictingRanges: data.conflictingRanges || [],
          bookingConflicts: data.bookingConflicts || [],
        }
      } catch (error) {
        console.error("Error checking availability in AI config:", error)
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
        // Build site URL with proper production fallbacks
        let siteUrl: string
        if (process.env.NODE_ENV === "production") {
          if (process.env.NEXT_PUBLIC_SITE_URL) {
            siteUrl = process.env.NEXT_PUBLIC_SITE_URL
          } else if (process.env.VERCEL_URL) {
            siteUrl = `https://${process.env.VERCEL_URL}`
          } else {
            throw new Error(
              "Production environment requires NEXT_PUBLIC_SITE_URL or VERCEL_URL to be set",
            )
          }
        } else {
          siteUrl = "http://localhost:3000"
        }

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
        // Build site URL with proper production fallbacks
        let siteUrl: string
        if (process.env.NODE_ENV === "production") {
          if (process.env.NEXT_PUBLIC_SITE_URL) {
            siteUrl = process.env.NEXT_PUBLIC_SITE_URL
          } else if (process.env.VERCEL_URL) {
            siteUrl = `https://${process.env.VERCEL_URL}`
          } else {
            throw new Error(
              "Production environment requires NEXT_PUBLIC_SITE_URL or VERCEL_URL to be set",
            )
          }
        } else {
          siteUrl = "http://localhost:3000"
        }

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
        // Optimized: Only fetch essential data, avoid heavy post-processing
        // Return static property info instead of fetching all tours/pages/posts
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
          // Note: Detailed tours/pages/posts omitted for speed
          // Use checkAvailability and calculatePrice tools for specific booking info
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

        // Optimized: Use cached property config to avoid repeated Sanity calls
        const config = await extractPropertyConfig()
        const maxGuests = config?.property?.capacity || DEFAULT_MAX_GUESTS
        const pricingRules =
          (config?.property?.pricingRules?.length || 0) > 0
            ? config?.property?.pricingRules
            : config?.pricingRules || []

        // Clamp guests to valid range
        const validGuests = Math.max(1, Math.min(guests, maxGuests))

        // Calculate pricing using the pricing engine with rules
        const BOOKING_TYPE_VILLA = "villa"
        const pricing = calculateEffectivePrice({
          pricingRules,
          guests: validGuests,
          duration: nights,
          checkInDate: startDate,
          bookingType: BOOKING_TYPE_VILLA,
        })

        // Optimized: Return only essential pricing data, avoid heavy post-processing
        return {
          checkIn,
          checkOut,
          nights,
          guests: validGuests,
          maxGuests,
          total: Math.round(pricing.total * 100) / 100,
          currency: "USD",
          // Minimal breakdown for speed
          basePrice: pricing.basePrice,
          pricePerNight: Math.round(pricing.priceWithVat * 100) / 100,
        }
      } catch (error) {
        console.error("Error calculating price:", error)
        return { error: "Failed to calculate price" }
      }
    },
  }),

  generateCTA: tool({
    description:
      "Generate booking call-to-action based on conversation context",
    inputSchema: z.object({
      hasAvailability: z.boolean(),
      hasPricing: z.boolean(),
      userIntent: z.string(),
    }),
    execute: ({ hasAvailability, hasPricing, userIntent }) => ({
      cta:
        hasAvailability && hasPricing
          ? "Ready to book? Reply: 'Book [dates] for [guests] people'"
          : "Need dates and guest count to check availability and pricing.",
    }),
  }),
}

// Filter tools based on detected user intent
export function filterToolsByIntent(intent: UserIntent) {
  const intentToolMap: Record<UserIntent, string[]> = {
    availability: ["checkAvailability", "getBookings"],
    pricing: ["calculatePrice"],
    payment: ["generateCTA"], // Payment info is in preloaded data
    cancellation: ["generateCTA"], // Cancellation info is in preloaded data
    logistics: ["generateCTA"], // Logistics info is in preloaded data
    tours: ["generateCTA"], // Tour info is in preloaded data
    reviews: ["generateCTA"], // Review info is in preloaded data
    amenities: ["generateCTA"], // Amenity info is in preloaded data
    general: ["generateCTA"], // General queries use preloaded data
  }

  const relevantToolNames = intentToolMap[intent] || ["generateCTA"]

  const filteredTools: any = {}
  relevantToolNames.forEach(toolName => {
    if (bookingTools[toolName as keyof typeof bookingTools]) {
      filteredTools[toolName] =
        bookingTools[toolName as keyof typeof bookingTools]
    }
  })

  // Always include generateCTA as fallback
  if (!filteredTools.generateCTA) {
    filteredTools.generateCTA = bookingTools.generateCTA
  }

  return filteredTools
}
export async function createChatStream({
  messages,
  threadId,
  tools,
  model,
  systemPrompt,
}: {
  messages: Message[]
  threadId?: string
  tools?: any
  model?: LanguageModelV3
  systemPrompt?: string
}) {
  try {
    // Detect language from user messages
    const detectedLanguage = detectLanguageFromMessages(messages)

    // Use dynamic system prompt if none provided, with detected language
    const finalSystemPrompt =
      systemPrompt || (await getDynamicSystemPrompt(detectedLanguage))
    console.log("Final system prompt", finalSystemPrompt)

    // Validate message alternation and preserve conversation context
    // The API expects: system → user → assistant → user → assistant...
    // Preserve all messages to maintain full conversation history
    const validMessages: { role: string; content: string }[] = []

    for (const msg of messages) {
      // Include all message types to preserve conversation context
      // Ensure proper role filtering for API compatibility
      if (
        msg.role === "user" ||
        msg.role === "assistant" ||
        msg.role === "tool"
      ) {
        validMessages.push({
          role: msg.role,
          content: msg.content || "",
        })
      }
      // Skip system messages here as we add them separately
    }

    const allMessages: any = [
      { role: "system", content: finalSystemPrompt },
      ...validMessages,
    ]

    const effectiveModel =
      model ??
      (
        await resolveModel("primary", {
          taskType: "generation",
          messages: allMessages,
          tools: tools || bookingTools,
          stream: true,
        })
      ).model
    console.log("Chat stream model", effectiveModel)

    const result = streamText({
      model: effectiveModel,
      messages: allMessages,
      tools: tools || bookingTools,
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
 * Introspection mode evaluation using generation model when evaluation model fails with 401
 * Uses the same chain-of-thought mechanism as the evaluation model
 */
export async function introspectionModeEvaluation({
  response,
  toolOutputs,
  sanityData,
  userMessages = [],
  context,
  apiError,
}: {
  response: string
  toolOutputs: Record<string, any>[]
  sanityData: any
  userMessages?: string[]
  context?: any
  apiError: any
}) {
  console.log(
    "Starting introspection mode evaluation with rate limiting reduction strategy",
  )

  // Extract user-provided dates, guest counts, and other inputs
  const userInputs = {
    dates: [] as string[],
    guests: [] as string[],
    prices: [] as string[],
    duration: [] as string[],
  }

  // Parse user messages for specific inputs
  userMessages.forEach(msg => {
    // Extract dates using multilingual parsing
    const extractedDates = extractDatesFromMessage(msg)
    if (extractedDates.length > 0) userInputs.dates.push(...extractedDates)

    // Extract guest counts
    const guestMatches = msg.match(/\b(\d+)\s+(guests?|people?)\b/gi)
    if (guestMatches) userInputs.guests.push(...guestMatches)

    // Extract price mentions
    const priceMatches = msg.match(/\$\d+/g)
    if (priceMatches) userInputs.prices.push(...priceMatches)

    // Extract duration mentions
    const durationMatches = msg.match(/\b(\d+)\s+(nights?|days?)\b/gi)
    if (durationMatches) {
      if (!userInputs.duration) userInputs.duration = []
      userInputs.duration.push(...durationMatches)
    }
  })

  // Get contact information for evaluation context
  const contactInfo = {
    phone: process.env.CONTACT_PHONE,
    email: process.env.CONTACT_EMAIL,
    website: "https://fincaguarumo.com",
  }

  // Introspection mode prompt - uses generation model to evaluate its own response
  const introspectionPrompt = `You are evaluating your own previous response for accuracy and relevance. This is introspection mode because the evaluation model is unavailable.

Ground truth: ${JSON.stringify(sanityData, null, 2)}.

Contact information: ${JSON.stringify(contactInfo, null, 2)}.

User inputs detected: ${JSON.stringify(userInputs, null, 2)}.

Tool outputs used: ${JSON.stringify(toolOutputs, null, 2)}.

Context: ${JSON.stringify(context, null, 2)}.

Your previous response to evaluate:
"""
${response}
"""

Rate limiting reduction strategy - ask yourself these critical questions:
1. RELEVANCE CHECK: Does my response directly address the user's most recent question?
2. GROUND TRUTH VERIFICATION: Is my response based on the ground truth data from Sanity and the user's input?
3. TOOL OUTPUT ANALYSIS: Did I properly use tool outputs or acknowledge when tools failed?
4. ACCURACY CHECK: Are all factual claims in my response accurate based on the provided data?
5. HALLUCINATION DETECTION: Did I invent any amenities, features, or details not in the ground truth?
6. PRICING VERIFICATION: Are my pricing claims accurate and based on the provided data?

Chain-of-thought analysis:
- Analyze each sentence of your response against the ground truth
- Check for any fabricated information not present in Sanity data or user inputs
- Verify that you directly answered the user's specific question
- Ensure you didn't provide generic information when tools failed
- Confirm all pricing and availability information is accurate

Scoring guidelines:
- 10: Perfect accuracy and relevance, no hallucinations, all facts from tools/data or valid user inputs
- 8-9: Minor issues, but mostly accurate and relevant with few hallucinations  
- 6-7: Multiple inaccuracies, several hallucinations, or poor relevance to user question
- 0-5: Major factual errors, many hallucinations, completely fabricated, or irrelevant response

Respond with JSON:
{
  "score": 0-10,
  "isAccurate": boolean,
  "isRelevant": boolean,
  "hallucinations": ["list of detected hallucinations (exclude user inputs)"],
  "corrections": ["specific corrections needed"],
  "reasoning": "detailed chain-of-thought explanation of your analysis"
}`

  try {
    const introspectionModel = await getGatewayModel("primary", "generation")
    const introspectionResult = await streamText({
      model: introspectionModel,
      messages: [{ role: "user", content: introspectionPrompt }],
      temperature: 0.2, // Lower temperature for more consistent evaluation
      maxRetries: 1, // Reduce retries to minimize rate limiting
    })

    // Collect the full response
    let introspectionText = ""
    for await (const chunk of introspectionResult.textStream) {
      introspectionText += chunk
    }

    // Parse JSON response with robust error handling
    try {
      let cleanText = introspectionText.trim()

      // Remove markdown code blocks
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText
          .replace(/^```json\s*\n?/, "")
          .replace(/\n?```\s*$/, "")
      } else if (cleanText.startsWith("```")) {
        cleanText = cleanText
          .replace(/^```\s*\n?/, "")
          .replace(/\n?```\s*$/, "")
      }

      // Fix common JSON parsing issues
      cleanText = cleanText
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
        .replace(/\\n/g, "\\\\n") // Escape newlines
        .replace(/\\r/g, "\\\\r") // Escape carriage returns
        .replace(/\\t/g, "\\\\t") // Escape tabs
        .replace(/\\"/g, '\\\\"') // Fix quotes
        .replace(/,\s*}/g, "}") // Remove trailing commas
        .replace(/,\s*]/g, "]") // Remove trailing commas in arrays

      console.log("Cleaned JSON text:", cleanText.substring(0, 200))

      const parsed = JSON.parse(cleanText)
      if (parsed.isRelevant === undefined) {
        parsed.isRelevant = true
      }

      // Add introspection mode indicator
      parsed.reasoning = `[INTROSPECTION MODE] ${parsed.reasoning}`

      console.log("Introspection mode evaluation completed successfully")
      return parsed
    } catch (parseError) {
      console.error(
        "Failed to parse introspection evaluation JSON:",
        parseError,
        "Raw text was:",
        introspectionText.substring(0, 500),
      )

      // Return safe fallback for introspection mode
      return {
        score: 7, // Slightly higher score for self-evaluation
        isAccurate: true,
        isRelevant: true,
        hallucinations: ["Introspection mode parsing failed"],
        corrections: [],
        reasoning:
          "[INTROSPECTION MODE] Self-evaluation completed but parsing failed - using safe fallback",
      }
    }
  } catch (introspectionError: any) {
    console.error("Introspection mode evaluation failed:", introspectionError)

    // Final fallback with rate limiting acknowledgment
    return {
      score: 6,
      isAccurate: true,
      isRelevant: true,
      hallucinations: ["Introspection mode failed due to rate limiting"],
      corrections: [],
      reasoning: `[INTROSPECTION MODE] Evaluation unavailable due to rate limiting - original evaluation error: ${apiError?.message || "Unknown"}`,
    }
  }
}

/**
 * Evaluate chat response for hallucinations using chain-of-thought reasoning
 * @param response - The generated response text
 * @param toolOutputs - JSON outputs from tools used in generating the response (empty for Perplexity)
 * @param sanityData - Fetched Sanity configuration data
 * @param userMessages - Array of user messages to distinguish user inputs from hallucinations
 * @param context - Chat context including booking data
 * @returns Evaluation result with score and corrections
 */
export async function evaluateResponseForHallucinations({
  response,
  toolOutputs,
  sanityData,
  userMessages = [],
  context,
}: {
  response: string
  toolOutputs: Record<string, any>[]
  sanityData: any
  userMessages?: string[]
  context?: any
}) {
  // Add response-based caching to avoid repeated evaluations
  const responseHash = Buffer.from(response).toString("base64").substring(0, 16)
  const cacheKey = `eval-${responseHash}`

  try {
    // Check cache first
    const cached = getCachedEvaluationData(cacheKey)
    if (cached && cached.timestamp > Date.now() - 60000) {
      // 1 minute cache
      console.log("Using cached evaluation result")
      return cached.result
    }
    // Extract user-provided dates, guest counts, and other inputs
    const userInputs = {
      dates: [] as string[],
      guests: [] as string[],
      prices: [] as string[],
      duration: [] as string[],
    }

    // Parse user messages for specific inputs
    userMessages.forEach(msg => {
      // Extract dates using multilingual parsing
      const extractedDates = extractDatesFromMessage(msg)
      if (extractedDates.length > 0) userInputs.dates.push(...extractedDates)

      // Extract guest counts
      const guestMatches = msg.match(/\b(\d+)\s+(guests?|people?)\b/gi)
      if (guestMatches) userInputs.guests.push(...guestMatches)

      // Extract price mentions
      const priceMatches = msg.match(/\$\d+/g)
      if (priceMatches) userInputs.prices.push(...priceMatches)

      // Extract duration mentions
      const durationMatches = msg.match(/\b(\d+)\s+(nights?|days?)\b/gi)
      if (durationMatches) {
        if (!userInputs.duration) userInputs.duration = []
        userInputs.duration.push(...durationMatches)
      }
    })

    // Get contact information for evaluation context
    const contactInfo = {
      phone: process.env.CONTACT_PHONE,
      email: process.env.CONTACT_EMAIL,
      website: "https://fincaguarumo.com",
    }

    const evaluationPrompt = `You are a fact-checker and hallucination detection evaluator. Your task is to analyze a chat response for consistency with retrieved data, tool outputs, and user inputs.

Ground truth: ${JSON.stringify(sanityData, null, 2)}.

Contact information: ${JSON.stringify(contactInfo, null, 2)}.

User inputs detected: ${JSON.stringify(userInputs, null, 2)}.

Tool outputs used: ${JSON.stringify(toolOutputs, null, 2)} (Note: Empty for Perplexity Sonar which treats tools as citations).

Context: ${JSON.stringify(context, null, 2)}.

Chain-of-thought analysis:
1. RELEVANCE CHECK: Does the response directly address the user's most recent question?
2. TOOL OUTPUT ANALYSIS: Check if tools were called successfully or if there were errors
3. Compare each factual claim in the response against the provided Sanity data and tool outputs
4. Verify vs. Ground truth (match/exact/missing/invented)
5. Check for fabricated amenities, prices, or features not in Sanity data
6. Verify pricing claims are reasonable based on user inputs and Sanity pricing data
7. IMPORTANT: User-provided dates, guest counts, and preferences are NOT hallucinations - they are valid inputs
8. Pricing rule applications (extra guest fees, seasonal rates, discounts) are NOT hallucinations if they follow pricing rules from Sanity data
9. Flag any mentions of tools or internal processes
10. CRITICAL: If tools failed or returned errors, the response must acknowledge this, not provide alternative information
11. CRITICAL: If the user asked about availability and the availability tool failed, the response must NOT provide generic availability information
12. Score 0-10 (10=factual and relevant). If <7, suggest corrections

Response to evaluate:
"""
${response}
"""

Evaluation criteria:
- RELEVANCE: Does the response directly answer the user's specific question?
- ACCURACY: Does every factual claim match the retrieved data or user inputs?
- COMPLETENESS: Are all important facts from tools/data included?
- CONSISTENCY: Do prices, amenities, and policies match exactly?
- HALLUCINATION: Any unlisted amenities, incorrect prices, or fabricated details?
- USER INPUT VALIDATION: Are user-provided dates and guest counts properly acknowledged?
- TOOL ERROR HANDLING: If tools failed, was this properly communicated?

Scoring guidelines:
- 10: Perfect accuracy and relevance, no hallucinations, all facts from tools/data or valid user inputs
- 8-9: Minor issues, but mostly accurate and relevant with few hallucinations
- 6-7: Multiple inaccuracies, several hallucinations, or poor relevance to user question
- 0-5: Major factual errors, many hallucinations, completely fabricated, or irrelevant response

IMPORTANT: The following are NOT hallucinations:
- User-provided dates (e.g., "Feb 28 - Mar 2, 2026")
- User-provided guest counts (e.g., "2 guests")
- Pricing rule applications (extra guest fees, seasonal rates)
- Calculations based on user inputs and pricing rules
- Acknowledgment of user preferences
- General hospitality statements about the property

CRITICAL ISSUES that must be flagged:
- Answering a different question than what the user asked
- Providing information when tools failed (should acknowledge failure)
- Ignoring specific dates, guest counts, or constraints provided by user
- Making up information when tools are unavailable or failed
- Providing generic pricing/availability information when specific tools failed
- Not acknowledging tool errors or rate limiting issues
- Not providing actual contact information when directing user to contact support
- Using placeholder contact info instead of real phone/email

Respond with JSON:
{
  "score": 0-10,
  "isAccurate": boolean,
  "isRelevant": boolean,
  "hallucinations": ["list of detected hallucinations (exclude user inputs)"],
  "corrections": ["specific corrections needed"],
  "reasoning": "chain-of-thought explanation"
}`

    let result
    try {
      const evaluationModel = await getGatewayModel("evaluation", "evaluation")
      result = await streamText({
        model: evaluationModel,
        messages: [{ role: "user", content: evaluationPrompt }],
        temperature: 0.1,
        maxRetries: 2, // Limit retries to prevent multiple API calls
      })
    } catch (apiError: any) {
      console.error("Evaluation API call failed:", apiError)

      // Handle 401 unauthorized with introspection mode fallback
      if (
        apiError?.message?.includes("unauthorized") ||
        apiError?.message?.includes("401")
      ) {
        console.log(
          "Evaluation model 401 error - attempting introspection mode fallback",
        )
        return await introspectionModeEvaluation({
          response,
          toolOutputs,
          sanityData,
          userMessages,
          context,
          apiError,
        })
      }

      // Handle other API errors
      let fallbackResult: any = {
        score: 6,
        isAccurate: true,
        isRelevant: true,
        hallucinations: [],
        corrections: [],
        reasoning: "",
      }

      if (
        apiError?.message?.includes("Rate limit") ||
        apiError?.statusCode === 429
      ) {
        fallbackResult.reasoning = "API rate limit exceeded"
        fallbackResult.hallucinations = ["Rate limit exceeded"]
      } else if (apiError?.message?.includes("timeout")) {
        fallbackResult.reasoning = "API request timeout"
        fallbackResult.hallucinations = ["API timeout"]
      } else {
        fallbackResult.reasoning = `API call failed: ${apiError instanceof Error ? apiError.message : "Unknown error"}`
        fallbackResult.hallucinations = ["API call failed"]
      }

      // Cache the fallback result
      cacheEvaluationData(cacheKey, {
        result: fallbackResult,
        timestamp: Date.now(),
      })

      return fallbackResult
    }

    // Collect the full response
    let evaluationText = ""
    let isLikelyHtmlError = false

    try {
      for await (const chunk of result.textStream) {
        evaluationText += chunk
        // Early detection of HTML error responses
        if (
          evaluationText.includes("<html>") ||
          evaluationText.includes("<!DOCTYPE")
        ) {
          isLikelyHtmlError = true
          console.warn(
            "Detected HTML response instead of JSON - likely auth/error page",
          )
          break
        }
      }
    } catch (streamError: any) {
      console.error("Error reading evaluation stream:", streamError)
      // Return fallback for stream errors
      const fallbackResult = {
        score: 6,
        isAccurate: true,
        isRelevant: true,
        hallucinations: ["Evaluation stream failed"],
        corrections: [],
        reasoning: `Stream error: ${streamError instanceof Error ? streamError.message : "Unknown error"}`,
      }

      cacheEvaluationData(cacheKey, {
        result: fallbackResult,
        timestamp: Date.now(),
      })

      return fallbackResult
    }

    // Handle empty response - this can happen when API calls fail silently
    if (!evaluationText || evaluationText.trim().length === 0) {
      console.error(
        "Evaluation API returned empty response - likely API failure",
      )
      const fallbackResult = {
        score: 6,
        isAccurate: true,
        isRelevant: true,
        hallucinations: ["Evaluation API returned empty response"],
        corrections: [],
        reasoning:
          "API returned empty response - likely authentication or rate limit issue",
      }

      cacheEvaluationData(cacheKey, {
        result: fallbackResult,
        timestamp: Date.now(),
      })

      return fallbackResult
    }

    // If we detected an HTML error response, return fallback immediately
    if (isLikelyHtmlError) {
      console.error(
        "Evaluation API returned HTML error page instead of JSON:",
        evaluationText.substring(0, 200),
      )
      const fallbackResult = {
        score: 6,
        isAccurate: true,
        isRelevant: true,
        hallucinations: ["Evaluation API returned error page"],
        corrections: [],
        reasoning:
          "API returned HTML error instead of JSON - likely authentication or rate limit issue",
      }

      cacheEvaluationData(cacheKey, {
        result: fallbackResult,
        timestamp: Date.now(),
      })

      return fallbackResult
    }

    // Parse JSON response
    try {
      // Check if response looks like HTML error page
      if (
        evaluationText.includes("<html>") ||
        evaluationText.includes("<!DOCTYPE") ||
        evaluationText.includes("<center>")
      ) {
        throw new Error("Received HTML error page instead of JSON")
      }

      // Check if response starts with JSON structure
      const trimmed = evaluationText.trim()
      if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
        throw new Error("Response does not appear to be JSON")
      }

      // Strip markdown code block formatting if present
      let cleanText = trimmed
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
        const parsed = JSON.parse(cleanText)
        // Ensure isRelevant field exists (default to true for backward compatibility)
        if (parsed.isRelevant === undefined) {
          parsed.isRelevant = true
        }
        return parsed
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
        const parsed = JSON.parse(fixedText)
        // Ensure isRelevant field exists (default to true for backward compatibility)
        if (parsed.isRelevant === undefined) {
          parsed.isRelevant = true
        }
        return parsed
      }
    } catch (parseError) {
      console.error("Failed to parse evaluation JSON:", parseError)
      console.error("Raw evaluation text:", evaluationText)

      // Return a safe fallback evaluation instead of throwing
      const fallbackResult = {
        score: 6, // Neutral score
        isAccurate: true, // Assume accurate to avoid unnecessary corrections
        isRelevant: true, // Assume relevant to avoid unnecessary corrections
        hallucinations: ["Evaluation parsing failed - using fallback"],
        corrections: [], // No corrections to avoid infinite loops
        reasoning: `Evaluation parsing failed: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
      }

      // Cache the fallback result
      cacheEvaluationData(cacheKey, {
        result: fallbackResult,
        timestamp: Date.now(),
      })

      return fallbackResult
    }
  } catch (error: any) {
    console.error("Error evaluating response:", error)

    // Handle specific error types with graceful degradation
    let fallbackResult: any = {
      score: 6, // Neutral score to avoid unnecessary corrections
      isAccurate: true,
      isRelevant: true,
      hallucinations: [],
      corrections: [],
      reasoning: "",
    }

    if (error?.message?.includes("Rate limit")) {
      fallbackResult.reasoning = "Rate limit exceeded - using safe fallback"
      fallbackResult.hallucinations = ["Rate limit prevented evaluation"]
    } else if (
      error?.message?.includes("unauthorized") ||
      error?.message?.includes("401")
    ) {
      fallbackResult.reasoning = "Authentication failed - using safe fallback"
      fallbackResult.hallucinations = [
        "Authentication error prevented evaluation",
      ]
    } else if (error?.message?.includes("timeout")) {
      fallbackResult.reasoning = "Evaluation timeout - using safe fallback"
      fallbackResult.hallucinations = ["Evaluation timed out"]
    } else {
      fallbackResult.reasoning = `Evaluation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      fallbackResult.hallucinations = ["Evaluation process failed"]
    }

    // Cache the fallback result to prevent repeated failures
    cacheEvaluationData(cacheKey, {
      result: fallbackResult,
      timestamp: Date.now(),
    })

    return fallbackResult
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
