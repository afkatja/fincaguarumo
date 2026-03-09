import "@testing-library/jest-dom"

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return "/"
  },
}))

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key, options) => {
    if (typeof options === "object" && options.defaultValue) {
      return options.defaultValue
    }
    return options || key
  },
  getTranslations: () => key => key,
}))

// Mock Sanity client
jest.mock("@/sanity/lib/clientSide", () => ({
  clientSideClient: {
    fetch: jest.fn(() => Promise.resolve({})),
  },
}))

// Mock Sanity queries
jest.mock("@/sanity/lib/queries", () => ({
  ALL_PAGES_QUERY: "",
  PAGES_QUERY: "",
  DIALOG_QUERY: "",
  TOURS_QUERY: "",
  TOUR_QUERY: "",
  ACCOMMODATIONS_QUERY: "",
  ACCOMMODATION_QUERY: "",
}))

// Suppress console errors in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Error fetching dialog:")
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key"
process.env.STRIPE_API_KEY = "sk_test_test"
process.env.STRIPE_SECRET_KEY = "whsec_test"
process.env.STRIPE_WEBHOOK_SECRET_LOCAL = "whsec_test_local"
