import "@testing-library/jest-dom"
import { TransformStream } from "node:stream/web"

// Used by @ai-sdk / eventsource-parser when adapter modules load in unit tests
globalThis.TransformStream ??= TransformStream

// Polyfill Web APIs for Jest environment
import { TextEncoder, TextDecoder } from "util"

// Add Web API polyfills
globalThis.TextEncoder = TextEncoder
globalThis.TextDecoder = TextDecoder

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
  useParams() {
    return {}
  },
}))

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key, options) => {
    if (typeof options === "object" && options.defaultValue) {
      return options.defaultValue
    }
    return key
  },
  getTranslations: () => key => key,
}))

// Mock react-markdown
jest.mock("react-markdown", () => {
  return function MockMarkdown({ children }) {
    return <div>{children}</div>
  }
})

// Mock remark-gfm
jest.mock("remark-gfm", () => ({}))

// Mock Sanity client
jest.mock("@/sanity/lib/clientSide", () => ({
  clientSideClient: {
    fetch: jest.fn(() => Promise.resolve({})),
  },
}))

// Mock BookingCoreProvider
jest.mock("@/app/providers/BookingCoreProvider", () => ({
  useBookingCore: () => ({
    state: {
      data: {
        source: "direct",
        customerDetails: null,
        bookingType: null,
        bookingDetails: {
          title: "",
          description: "",
          location: "",
        },
        dates: {
          date: null,
          checkIn: null,
          checkOut: null,
        },
        guests: 1,
        baseUnitPrice: 0,
        totalPrice: 0,
        currency: "USD",
        pricingRules: [],
      },
      isLoading: false,
      error: null,
    },
    actions: {
      setBookingType: jest.fn(),
      setBookingDetails: jest.fn(),
      setDates: jest.fn(),
      setGuests: jest.fn(),
      setCustomerDetails: jest.fn(),
      reset: jest.fn(),
    },
  }),
}))

// Mock PageContext
jest.mock("@/hooks/usePageContext", () => ({
  usePageContext: () => ({
    page: {
      title: "Test Page",
      slug: "test-page",
    },
  }),
}))

// Mock navigation.ts
jest.mock("@/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  getPathname: () => "/",
  redirect: jest.fn(),
  usePathname: () => "/",
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
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

// Mock scrollIntoView for tests
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn()
})

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
process.env.STRIPE_WEBHOOK_SECRET_LOCAL = "whsec_test_local"
process.env.OPENAI_API_KEY = "test-openai-key"
process.env.ANTHROPIC_API_KEY = "test-anthropic-key"
process.env.SUPABASE_URL = "http://localhost:54321"
process.env.SUPABASE_ANON_KEY = "test-key"
process.env.STRIPE_SECRET_KEY = "sk_test_test"
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"
process.env.RESEND_API_KEY = "test-resend-key"
process.env.ADMIN_SECRET = "test-secret"
