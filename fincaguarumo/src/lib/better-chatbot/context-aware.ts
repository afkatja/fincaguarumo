import { BookingData } from "@/types"

// Context types
export type ChatContext = {
  page: "homepage" | "villa-bruno" | "other"
  locale: string
  bookingData?: BookingData
  propertyTitle?: string
  userIntent?: "booking" | "inquiry" | "support" | "general"
}

// Multilingual keywords for intent detection
const bookingKeywords = {
  en: [
    "book",
    "reserve",
    "availability",
    "dates",
    "check-in",
    "check-out",
    "booking",
    "reservation",
  ],
  es: [
    "reservar",
    "reserva",
    "disponibilidad",
    "fechas",
    "entrada",
    "salida",
    "reservación",
  ],
  de: [
    "buchen",
    "reservieren",
    "verfügbarkeit",
    "daten",
    "einchecken",
    "auschecken",
  ],
  nl: [
    "boeken",
    "reserveren",
    "beschikbaarheid",
    "data",
    "inchecken",
    "uitchecken",
  ],
  ru: ["забронировать", "бронь", "доступность", "даты", "заезд", "выезд"],
}

const supportKeywords = {
  en: ["help", "support", "problem", "issue", "error"],
  es: ["ayuda", "soporte", "problema", "problema", "error"],
  de: ["hilfe", "unterstützung", "problem", "fehler"],
  nl: ["hulp", "ondersteuning", "probleem", "fout"],
  ru: ["помощь", "поддержка", "проблема", "ошибка"],
}

const inquiryKeywords = {
  en: ["what", "how", "where", "when", "why", "?"],
  es: ["qué", "cómo", "dónde", "cuándo", "por qué", "?"],
  de: ["was", "wie", "wo", "wann", "warum", "?"],
  nl: ["wat", "hoe", "waar", "wanneer", "waarom", "?"],
  ru: ["что", "как", "где", "когда", "почему", "?"],
}

// Context-aware prompts based on page
export const getContextAwarePrompt = (context: ChatContext): string => {
  const { page, locale, bookingData, propertyTitle } = context

  let contextPrompt = ""

  switch (page) {
    case "homepage":
      contextPrompt = `
The user is on homepage. They may be:
- Exploring the property for the first time
- Looking for general information about Villa Bruno
- Considering booking but haven't started the process

Focus on:
- Providing an overview of the property
- Highlighting key features and amenities
- Encouraging them to explore villa details
- Offering to check availability for specific dates
`
      break

    case "villa-bruno":
      contextPrompt = `
The user is viewing the ${propertyTitle || "Villa Bruno"} page. They may be:
- Interested in this specific property
- Ready to book or considering booking
- Looking for detailed information about amenities, location, etc.

Focus on:
- Providing specific details about ${propertyTitle || "Villa Bruno"}
- Answering questions about amenities, location, and features
- Guiding them through the booking process
- Checking availability for their preferred dates
`
      break

    default:
      contextPrompt = `
The user is on a general page. Provide helpful assistance based on their questions.
`
  }

  // Add booking context if available
  if (bookingData?.bookingDetails) {
    const { checkIn, checkOut, guests, type } = bookingData.bookingDetails

    if (checkIn || checkOut) {
      contextPrompt += `

Current booking context:
- Check-in: ${checkIn || "Not selected"}
- Check-out: ${checkOut || "Not selected"}
- Guests: ${guests || 1}
- Booking type: ${type || "Not specified"}

Use this information to provide more personalized assistance.`
    }
  }

  // Add language context
  contextPrompt += `

Language context: The user is viewing the site in ${locale}. Respond in the same language when possible.`

  return contextPrompt
}

// Detect user intent from message with multilingual support
export const detectUserIntent = (
  message: string,
  locale: string = "en",
): ChatContext["userIntent"] => {
  const lowerMessage = message.toLowerCase()

  // Get keywords for the user's locale
  const lang = locale.split("-")[0] // Handle locales like "en-US"
  const bookingWords =
    bookingKeywords[lang as keyof typeof bookingKeywords] || bookingKeywords.en
  const supportWords =
    supportKeywords[lang as keyof typeof supportKeywords] || supportKeywords.en
  const inquiryWords =
    inquiryKeywords[lang as keyof typeof inquiryKeywords] || inquiryKeywords.en

  // Booking intent - check for any booking-related keyword in any language
  const hasBookingKeyword = Object.values(bookingKeywords).some(keywords =>
    keywords.some(keyword => lowerMessage.includes(keyword)),
  )

  if (hasBookingKeyword) {
    return "booking"
  }

  // Support intent - check for any support-related keyword in any language
  const hasSupportKeyword = Object.values(supportKeywords).some(keywords =>
    keywords.some(keyword => lowerMessage.includes(keyword)),
  )

  if (hasSupportKeyword) {
    return "support"
  }

  // Inquiry intent - check for any inquiry-related keyword in any language
  const hasInquiryKeyword = Object.values(inquiryKeywords).some(keywords =>
    keywords.some(keyword => lowerMessage.includes(keyword)),
  )

  if (hasInquiryKeyword) {
    return "inquiry"
  }

  return "general"
}

// Get personalized greeting based on context using next-intl translations
export const getPersonalizedGreeting = (
  context: ChatContext,
  t: (key: string, values?: Record<string, string>) => string,
): string => {
  const { page, propertyTitle } = context

  switch (page) {
    case "homepage":
      return t("greetings.homepage")
    case "villa-bruno":
      return t("greetings.stay", {
        propertyTitle: propertyTitle || "Villa Bruno",
      })
    default:
      return t("greetings.other")
  }
}

// Suggest next actions based on context
export const suggestNextActions = (context: ChatContext): string[] => {
  const { page, bookingData } = context
  const actions: string[] = []

  switch (page) {
    case "homepage":
      actions.push(
        "Explore villa details",
        "Check availability",
        "Learn about amenities",
      )
      break

    case "villa-bruno":
      actions.push(
        "Check availability for dates",
        "Book now",
        "Ask about amenities",
      )
      break

    default:
      actions.push("Ask a question", "Check availability", "Book now")
  }

  return actions
}
