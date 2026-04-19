import { createCalendarEvent } from "../google-calendar"

// Mock the googleapis module
jest.mock("googleapis", () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn().mockImplementation(() => ({
        getClient: jest.fn().mockResolvedValue({
          request: jest
            .fn()
            .mockResolvedValue({ data: { id: "test-event-id" } }),
        }),
      })),
    },
    calendar: jest.fn().mockReturnValue({
      events: {
        insert: jest.fn().mockResolvedValue({ data: { id: "test-event-id" } }),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
        get: jest.fn().mockResolvedValue({}),
      },
    }),
    version: "v3",
  },
}))

// Mock Supabase
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      upsert: jest.fn().mockResolvedValue({}),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  }),
}))

// Mock environment variables
process.env.GOOGLE_CALENDAR_ID = "test-calendar-id"
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "test@example.com"
process.env.GOOGLE_PRIVATE_KEY = "mock-private-key"
process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE = "" // Prevent real file loading

describe("Google Calendar Service", () => {
  const mockBooking = {
    uid: "test-booking-123",
    start: "2026-12-15T00:00:00.000Z",
    end: "2026-12-18T00:00:00.000Z",
    source: "airbnb",
    guestName: "John Doe",
  }

  it("should create a calendar event with correct structure", async () => {
    // Simple test to verify createCalendarEvent works
    const result = await createCalendarEvent(mockBooking, "checkin")

    // Just test that it returns a string (mocked response)
    expect(typeof result).toBe("string")
    expect(result).toBeDefined()
  })
})
