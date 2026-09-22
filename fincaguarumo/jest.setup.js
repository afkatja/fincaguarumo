import "@testing-library/jest-dom"

// Mock Request for Node.js environment (needed for API route tests)
global.Request = class Request {
  constructor(input, init) {
    this.url = typeof input === "string" ? input : input.url
    this.method = init?.method || "GET"
    this.headers = new Headers(init?.headers)
    this.body = init?.body
  }
  async json() {
    return typeof this.body === "string" ? JSON.parse(this.body) : this.body
  }
}

global.Response = class Response {
  constructor(body, init) {
    this.body = body
    this.status = init?.status || 200
    this.statusText = init?.statusText || "OK"
    this.headers = new Headers(init?.headers)
  }
  async json() {
    return typeof this.body === "string" ? JSON.parse(this.body) : this.body
  }
}

global.Headers = Headers

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
    return key
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

// Mock environment variables for testing
// Note: These are test-only values and should never be used in production
process.env.SUPABASE_URL = "http://localhost:54321"
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
process.env.SITE_URL = "http://localhost:3000"
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key"
process.env.STRIPE_API_KEY = "sk_test_test" // Test-only Stripe key for Jest environment
process.env.STRIPE_WEBHOOK_SECRET_LOCAL = "whsec_test_local"
