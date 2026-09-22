import "@testing-library/jest-dom"

// Polyfill Request/Response for Node.js environment
const OriginalRequest = global.Request
const OriginalResponse = global.Response

class MockRequest {
  constructor(input, init = {}) {
    this._url = ""
    this._method = "GET"
    this._headers = new Headers()
    this._body = undefined

    if (typeof input === "string") {
      this._url = input
    } else if (input instanceof URL) {
      this._url = input.toString()
    } else if (input instanceof MockRequest || (OriginalRequest && input instanceof OriginalRequest)) {
      this._url = input.url
      this._method = input.method
      this._headers = new Headers(input.headers)
      this._body = input.body
    } else {
      this._url = ""
    }
    if (init.method) this._method = init.method
    if (init.headers) this._headers = new Headers(init.headers)
    if (init.body !== undefined) this._body = init.body
  }

  get url() { return this._url }
  get method() { return this._method }
  get headers() { return this._headers }
  get body() { return this._body }
  get bodyUsed() { return false }

  async json() {
    return typeof this._body === "string" ? JSON.parse(this._body) : this._body
  }
  async text() {
    return typeof this._body === "string" ? this._body : JSON.stringify(this._body)
  }
  async blob() { return new Blob() }
  async arrayBuffer() { return new ArrayBuffer(0) }
  async formData() { return new FormData() }
  clone() { return new MockRequest(this) }
}

class MockResponse {
  constructor(body = null, init = {}) {
    this._body = body
    this._status = init.status || 200
    this._statusText = init.statusText || "OK"
    this._headers = new Headers(init.headers)
  }

  get status() { return this._status }
  get statusText() { return this._statusText }
  get headers() { return this._headers }
  get ok() { return this._status >= 200 && this._status < 300 }
  get body() { return this._body }
  get bodyUsed() { return false }

  async json() {
    return typeof this._body === "string" ? JSON.parse(this._body) : this._body
  }
  async text() {
    return typeof this._body === "string" ? this._body : JSON.stringify(this._body)
  }
  async blob() { return new Blob() }
  async arrayBuffer() { return new ArrayBuffer(0) }
  async formData() { return new FormData() }
  clone() { return new MockResponse(this._body, { status: this._status, statusText: this._statusText, headers: this._headers }) }

  // Static factory method for NextResponse.json()
  static json(data, init = {}) {
    return new MockResponse(JSON.stringify(data), {
      status: init.status || 200,
      headers: { "Content-Type": "application/json", ...init.headers },
    })
  }
}

// Replace globals
global.Request = MockRequest
global.Response = MockResponse
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
process.env.STRIPE_API_KEY = "sk_test_test"
process.env.STRIPE_WEBHOOK_SECRET_LOCAL = "whsec_test_local"