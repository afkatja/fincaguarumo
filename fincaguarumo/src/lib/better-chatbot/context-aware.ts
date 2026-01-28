import { BookingData } from "@/types"

// Context types
export type ChatContext = {
  page: "homepage" | "stay" | "other"
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

    case "stay":
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

// Get personalized greeting based on context
export const getPersonalizedGreeting = (context: ChatContext): string => {
  const { page, locale, propertyTitle } = context

  const greetings: Record<string, Record<string, string>> = {
    en: {
      homepage: "Welcome to Villa Bruno! How can I help you today?",
      stay: `Hi! I'm here to help you book ${propertyTitle || "Villa Bruno"}. What would you like to know?`,
      other: "Hello! How can I assist you today?",
    },
    es: {
      homepage: "¡Bienvenido a Villa Bruno! ¿Cómo puedo ayudarte hoy?",
      stay: `¡Hola! Estoy aquí para ayudarte a reservar ${propertyTitle || "Villa Bruno"}. ¿Qué te gustaría saber?`,
      other: "¡Hola! ¿Cómo puedo asistirte hoy?",
    },
    de: {
      homepage: "Willkommen bei Villa Bruno! Wie kann ich Ihnen heute helfen?",
      stay: `Hallo! Ich bin hier, um Ihnen bei der Buchung von ${propertyTitle || "Villa Bruno"} zu helfen. Was möchten Sie wissen?`,
      other: "Hallo! Wie kann ich Ihnen heute helfen?",
    },
    nl: {
      homepage: "Welkom bij Villa Bruno! Hoe kan ik u vandaag helpen?",
      stay: `Hallo! Ik ben hier om u te helpen met het boeken van ${propertyTitle || "Villa Bruno"}. Wat wilt u weten?`,
      other: "Hallo! Hoe kan ik u vandaag helpen?",
    },
    ru: {
      homepage:
        "Добро пожаловать в Виллу Бруно! Чем я могу помочь вам сегодня?",
      stay: `Привет! Я здесь, чтобы помочь вам забронировать ${propertyTitle || "Виллу Бруно"}. Что вы хотели бы узнать?`,
      other: "Привет! Чем я могу помочь вам сегодня?",
    },
  }

  return greetings[locale]?.[page] || greetings.en.other
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

    case "stay":
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
