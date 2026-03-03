// Enhanced intent detection with synonyms and typo tolerance
export type UserIntent =
  | "amenities"
  | "pricing"
  | "payment"
  | "cancellation"
  | "logistics"
  | "tours"
  | "reviews"
  | "availability"
  | "general"

// Enhanced keyword mappings with synonyms and common typos
const intentKeywords: Record<UserIntent, string[]> = {
  amenities: [
    // Exact matches
    "amenit",
    "facilit",
    "feature",
    "pool",
    "wifi",
    "kitchen",
    "equipment",
    "convenience",
    // Common synonyms
    "facilities",
    "features",
    "equipment",
    "conveniences",
    "services",
    "utilities",
    // Specific amenities
    "air conditioning",
    "ac",
    "heating",
    "parking",
    "gym",
    "fitness",
    "laundry",
    "beach",
    "ocean",
    "view",
    "balcony",
    "terrace",
    "garden",
    "bbq",
    "grill",
    // Common typos
    "amenites",
    "facilities",
    "featurs",
    "conviniences",
    "amneties",
  ],
  pricing: [
    // Exact matches
    "price",
    "cost",
    "fee",
    "discount",
    "season",
    "rate",
    "pricing",
    "rates",
    // Synonyms
    "charge",
    "payment",
    "expense",
    "tariff",
    "value",
    "amount",
    "money",
    // Related terms
    "cheap",
    "expensive",
    "affordable",
    "budget",
    "deal",
    "offer",
    "promotion",
    // Common typos
    "prce",
    "cst",
    "dicsount",
    "seasson",
    "rates",
  ],
  payment: [
    // Exact matches
    "payment",
    "pay",
    "card",
    "stripe",
    "paypal",
    "transaction",
    // Synonyms
    "billing",
    "charge",
    "purchase",
    "checkout",
    "credit",
    "debit",
    "transfer",
    // Related terms
    "secure",
    "safe",
    "method",
    "option",
    "processor",
    "gateway",
    // Common typos
    "paymnet",
    "paymet",
    "crdit",
    "trasnfer",
  ],
  cancellation: [
    // Exact matches
    "cancel",
    "refund",
    "modification",
    "change",
    "cancellation",
    // Synonyms
    "modify",
    "alter",
    "adjust",
    "revoke",
    "terminate",
    "reschedule",
    "postpone",
    // Related terms
    "policy",
    "rules",
    "terms",
    "conditions",
    "penalty",
    "fee",
    "refundable",
    // Common typos
    "cancle",
    "refud",
    "modifcation",
    "cancelllation",
  ],
  logistics: [
    // Exact matches
    "check",
    "arrival",
    "departure",
    "transport",
    "direction",
    "parking",
    // Synonyms
    "checkin",
    "checkout",
    "transportation",
    "travel",
    "location",
    "address",
    "route",
    "access",
    "entry",
    "exit",
    "pickup",
    "dropoff",
    "shuttle",
    "transfer",
    // Related terms
    "airport",
    "car",
    "rental",
    "taxi",
    "uber",
    "bus",
    "directions",
    "map",
    // Common typos
    "chek",
    "arival",
    "departre",
    "trasnport",
    "directon",
    "parkng",
  ],
  tours: [
    // Exact matches
    "tour",
    "activity",
    "excursion",
    "trip",
    "experience",
    // Synonyms
    "adventure",
    "journey",
    "travel",
    "expedition",
    "outing",
    "sightseeing",
    "attraction",
    "destination",
    "activity",
    "event",
    "guide",
    "local",
    // Related terms
    "book",
    "reserve",
    "schedule",
    "available",
    "price",
    "duration",
    "time",
    // Common typos
    "tou",
    "activty",
    "excursin",
    "trip",
    "experince",
  ],
  reviews: [
    // Exact matches
    "review",
    "rating",
    "guest",
    "experience",
    "feedback",
    "testimonial",
    // Synonyms
    "opinion",
    "comment",
    "evaluation",
    "assessment",
    "recommendation",
    "score",
    // Related terms
    "stars",
    "average",
    "quality",
    "satisfaction",
    "service",
    "cleanliness",
    // Common typos
    "reviw",
    "rating",
    "gest",
    "experince",
    "feddback",
  ],
  availability: [
    // Exact matches
    "availability",
    "available",
    "book",
    "booking",
    "reservation",
    "schedule",
    // Synonyms
    "open",
    "free",
    "vacant",
    "unoccupied",
    "reserve",
    "reserve",
    "dates",
    // Related terms
    "calendar",
    "check",
    "confirm",
    "status",
    "when",
    "time",
    "period",
    // Common typos
    "availablity",
    "availble",
    "booking",
    "reservtion",
    "schedul",
  ],
  general: [
    // Fallback terms that don't fit other categories
    "information",
    "info",
    "details",
    "about",
    "help",
    "question",
    "contact",
    "support",
    "assistance",
    "guidance",
    "advice",
    "recommendation",
  ],
}

// Fuzzy matching function for typo tolerance
function fuzzyMatch(term: string, keyword: string): boolean {
  // Exact match
  if (term.includes(keyword)) return true

  // Check if keyword is contained in term
  if (keyword.includes(term)) return true

  // Simple typo tolerance: check if most characters match
  if (term.length >= 3 && keyword.length >= 3) {
    const shorter = term.length < keyword.length ? term : keyword
    const longer = term.length >= keyword.length ? term : keyword

    // Check if at least 70% of characters match in order
    let matches = 0
    let longerIndex = 0

    for (let i = 0; i < shorter.length && longerIndex < longer.length; i++) {
      if (shorter[i] === longer[longerIndex]) {
        matches++
        longerIndex++
      } else {
        // Skip one character in longer string
        longerIndex++
        if (shorter[i] === longer[longerIndex]) {
          matches++
          longerIndex++
        }
      }
    }

    return matches / shorter.length >= 0.7
  }

  return false
}

export function detectUserIntent(query: string): UserIntent {
  const lowerQuery = query.toLowerCase().trim()

  // Check each intent type
  for (const [intent, keywords] of Object.entries(intentKeywords)) {
    for (const keyword of keywords) {
      if (fuzzyMatch(lowerQuery, keyword.toLowerCase())) {
        return intent as UserIntent
      }
    }
  }

  return "general"
}

// Get progress message based on intent
export function getProgressMessage(intent: UserIntent): string {
  switch (intent) {
    case "availability":
      return "Checking availability..."
    case "pricing":
      return "Calculating pricing..."
    case "amenities":
    case "general":
      return "Getting property information..."
    case "payment":
      return "Processing payment information..."
    case "cancellation":
      return "Checking cancellation policy..."
    case "logistics":
      return "Getting logistics information..."
    case "tours":
      return "Finding available tours..."
    case "reviews":
      return "Loading guest reviews..."
    default:
      return "Processing your request..."
  }
}

// Enhanced query terms for better matching
export function enhanceQuery(query: string): string[] {
  const lowerQuery = query.toLowerCase()
  const terms = [lowerQuery]
  const intent = detectUserIntent(query)

  // Add synonyms based on detected intent
  const keywords = intentKeywords[intent]
  keywords.forEach(keyword => {
    if (
      lowerQuery.includes(keyword.split(" ")[0]) &&
      !terms.includes(keyword)
    ) {
      terms.push(keyword)
    }
  })

  return terms
}
