import {
  syncBookingsToCalendar,
  getCalendarSyncService,
  setTestSupabaseClient,
  setTestSiteUrl,
  resetTestOverrides,
  resetCalendarSyncService,
} from "../calendar-sync"
import { Booking } from "../setBookings"

// Mock Supabase client factory
const createMockSupabase = () => {
  const mockEq = jest.fn().mockResolvedValue({ data: [], error: null })
  const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null })
  const mockSelect = jest.fn().mockReturnValue({
    eq: mockEq,
    order: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        single: mockSingle,
      }),
    }),
    single: mockSingle,
  })

  const mockUpsert = jest.fn().mockResolvedValue({
    data: [{ id: "sync-log-456" }],
    error: null,
  })

  const mockFrom = jest.fn().mockReturnValue({
    select: mockSelect,
    insert: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({
        data: [{ id: "sync-log-123" }],
        error: null,
      }),
    }),
    upsert: mockUpsert,
    delete: jest.fn().mockReturnValue({
      lt: jest.fn().mockResolvedValue({
        error: null,
      }),
    }),
  })

  const mockClient = {
    from: mockFrom,
  }

  return { mockClient, mockEq, mockSingle, mockUpsert, mockFrom, mockSelect }
}

let mockSupabase: ReturnType<typeof createMockSupabase>["mockClient"]
let mockEq: jest.Mock
let mockSingle: jest.Mock
let mockUpsert: jest.Mock
let mockFrom: jest.Mock

// Mock the Google Calendar service
jest.mock("../google-calendar", () => ({
  googleCalendarService: {
    createEvent: jest.fn(),
    updateEvent: jest.fn(),
    deleteEvent: jest.fn(),
    eventExists: jest.fn(),
    getSyncLog: jest.fn(),
    findEventByBookingUid: jest.fn(),
  },
}))

// Mock Supabase createClient - no longer needed with test overrides
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}))

// Mock fetch for API calls
global.fetch = jest.fn()

describe("Calendar Sync Service", () => {
  const mockBookings: Booking[] = [
    {
      uid: "booking-1",
      start: "2026-12-15T00:00:00.000Z",
      end: "2026-12-18T00:00:00.000Z",
      summary: "Test Booking - John Doe",
      source: "airbnb",
      guestName: "John Doe",
      email: "john.doe@example.com",
      phone: "+1234567890",
      guests: 2,
    },
    {
      uid: "booking-2",
      start: "2026-12-20T00:00:00.000Z",
      end: "2026-12-25T00:00:00.000Z",
      summary: "Test Booking - Jane Smith",
      source: "booking",
      guestName: "Jane Smith",
      email: "jane.smith@example.com",
      phone: "+0987654321",
      guests: 1,
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    const mockResult = createMockSupabase()
    mockSupabase = mockResult.mockClient
    mockEq = mockResult.mockEq
    mockSingle = mockResult.mockSingle
    mockUpsert = mockResult.mockUpsert
    mockFrom = mockResult.mockFrom
    setTestSupabaseClient(mockSupabase as any)
    setTestSiteUrl("http://localhost:3000")
  })

  afterEach(() => {
    resetTestOverrides()
    resetCalendarSyncService()
  })

  describe("Background Sync Process (AC1, AC3)", () => {
    it("should fetch bookings from existing /api/ical/merged endpoint (AC1)", async () => {
      const mockResponse = {
        bookings: mockBookings,
        merged: [
          {
            start: "2026-12-15T00:00:00.000Z",
            end: "2026-12-18T00:00:00.000Z",
            blocked: [1, 2, 3],
          },
        ],
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await getCalendarSyncService().fetchBookingsFromAPI()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/ical/merged"),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      )
      expect(result).toEqual(mockResponse.bookings)
    })

    it("should sync bookings to calendar without performance impact (AC3)", async () => {
      const { googleCalendarService } = require("../google-calendar")
      googleCalendarService.getSyncLog.mockResolvedValue(null)
      googleCalendarService.createEvent.mockResolvedValue("event-123")

      const result = await syncBookingsToCalendar(mockBookings)

      expect(result.processed).toBe(2)
      expect(result.success).toBe(2)
      expect(result.failed).toBe(0)
      expect(result.created).toBe(2)
      expect(googleCalendarService.createEvent).toHaveBeenCalledTimes(2)
    })

    it("should handle booking updates in calendar (AC3)", async () => {
      const { googleCalendarService } = require("../google-calendar")
      googleCalendarService.eventExists.mockResolvedValue(true)
      googleCalendarService.updateEvent.mockResolvedValue(true)

      // Reset mock to default behavior
      mockSingle.mockReset()
      mockSingle.mockResolvedValue({
        data: { gcal_event_id: "existing-event" },
        error: null,
      })

      const result = await syncBookingsToCalendar(mockBookings)

      expect(result.processed).toBe(2)
      expect(result.success).toBe(2)
      expect(result.updated).toBe(2)
      expect(result.created).toBe(0)
      expect(googleCalendarService.updateEvent).toHaveBeenCalledTimes(2)
    })

    it("should handle cancelled bookings by removing from calendar (AC3)", async () => {
      const { googleCalendarService } = require("../google-calendar")
      googleCalendarService.getSyncLog.mockResolvedValue({
        gcal_event_id: "existing-event",
      })
      googleCalendarService.eventExists.mockResolvedValue(true)
      googleCalendarService.deleteEvent.mockResolvedValue(true)

      const cancelledBooking = {
        ...mockBookings[0],
        status: "cancelled",
      }

      const result = await syncBookingsToCalendar([cancelledBooking])

      expect(result.deleted).toBe(1)
      expect(result.success).toBe(1)
    })
  })

  describe("Sync State Tracking (TR7)", () => {
    it("should record sync state in gcal_sync_log table", async () => {
      await getCalendarSyncService().recordSyncState(
        "booking-1",
        "event-123",
        "success",
      )

      expect(mockSupabase.from).toHaveBeenCalledWith("gcal_sync_log")
      expect(mockSupabase.from().upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          booking_id: "booking-1",
          gcal_event_id: "event-123",
          status: "success",
          synced_at: expect.any(String),
        }),
        expect.any(Object),
      )
    })

    it("should update existing sync records", async () => {
      const mockExistingSync = [
        {
          id: "existing-sync-123",
          booking_id: "booking-1",
          gcal_event_id: "old-event-123",
          status: "pending",
        },
      ]

      mockEq.mockResolvedValueOnce({
        data: mockExistingSync,
        error: null,
      })

      await getCalendarSyncService().recordSyncState(
        "booking-1",
        "new-event-123",
        "success",
      )

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          booking_id: "booking-1",
          gcal_event_id: "new-event-123",
          status: "success",
        }),
        expect.any(Object),
      )
    })
  })

  describe("Idempotency (TR6)", () => {
    it("should use existing gcal_event_id for updates", async () => {
      const { googleCalendarService } = require("../google-calendar")
      googleCalendarService.eventExists.mockResolvedValue(true)
      googleCalendarService.updateEvent.mockResolvedValue(true)

      // Reset mock to default behavior
      mockSingle.mockReset()
      mockSingle.mockResolvedValue({
        data: { gcal_event_id: "existing-event" },
        error: null,
      })

      const result = await syncBookingsToCalendar([mockBookings[0]])

      expect(result.updated).toBe(1)
      expect(googleCalendarService.updateEvent).toHaveBeenCalledTimes(1)
      expect(googleCalendarService.updateEvent).toHaveBeenCalledWith(
        "existing-event",
        expect.any(Object),
      )
    })
  })

  describe("Error Handling and Retry Logic (Edge Cases)", () => {
    it("should handle API failures gracefully", async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error"),
      )

      const result = await getCalendarSyncService().fetchBookingsFromAPI()

      expect(result).toEqual([])
    })

    it("should implement exponential backoff for calendar API failures", async () => {
      const { googleCalendarService } = require("../google-calendar")
      const retryError = new Error("Rate limit exceeded") as any
      retryError.code = 429

      googleCalendarService.getSyncLog.mockResolvedValue(null)
      googleCalendarService.createEvent
        .mockRejectedValueOnce(retryError)
        .mockRejectedValueOnce(retryError)
        .mockResolvedValueOnce("retry-success-event")

      const result = await syncBookingsToCalendar([mockBookings[0]])

      expect(result.success).toBe(1)
      expect(result.retries).toBe(2)
      expect(googleCalendarService.createEvent).toHaveBeenCalledTimes(3)
    }, 10000)

    it("should handle partial sync failures", async () => {
      const { googleCalendarService } = require("../google-calendar")
      googleCalendarService.getSyncLog.mockResolvedValue(null)
      googleCalendarService.createEvent
        .mockResolvedValueOnce("success-event-1")
        .mockRejectedValueOnce(new Error("Calendar API error"))

      const result = await syncBookingsToCalendar(mockBookings)

      expect(result.processed).toBe(2)
      expect(result.success).toBe(1)
      expect(result.failed).toBe(1)
      expect(result.errors).toHaveLength(1)
    })
  })

  describe("Cron Frequency (TR8)", () => {
    it("should respect 15-minute sync frequency", async () => {
      const lastSyncTime = new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
      const mockSyncRecord = {
        synced_at: lastSyncTime.toISOString(),
        status: "success",
      }

      // Reset mock to default behavior
      mockSingle.mockReset()
      mockSingle.mockResolvedValue({
        data: mockSyncRecord,
        error: null,
      })

      const shouldSync = await getCalendarSyncService().shouldRunSync()

      expect(shouldSync).toBe(false) // Should not sync yet (only 10 minutes passed)
    })

    it("should trigger sync when 15 minutes have passed", async () => {
      const lastSyncTime = new Date(Date.now() - 20 * 60 * 1000) // 20 minutes ago
      const mockSyncRecord = {
        synced_at: lastSyncTime.toISOString(),
        status: "success",
      }

      mockSingle.mockResolvedValueOnce({
        data: mockSyncRecord,
        error: null,
      })

      const shouldSync = await getCalendarSyncService().shouldRunSync()

      expect(shouldSync).toBe(true) // Should sync (20 minutes passed > 15 minutes)
    })
  })

  describe("Initial Backfill (TR10)", () => {
    it("should handle initial backfill for existing bookings", async () => {
      const { googleCalendarService } = require("../google-calendar")
      googleCalendarService.createEvent.mockResolvedValue("backfill-event-1")

      // Reset mocks to default behavior
      mockEq.mockReset()
      mockSingle.mockReset()

      // Mock Supabase to return no existing sync logs (empty array)
      mockEq.mockResolvedValue({
        data: [],
        error: null,
      })

      // Also need to mock the getSyncLog calls within performInitialBackfill
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: "PGRST116" }, // No rows found
      })

      const result =
        await getCalendarSyncService().performInitialBackfill(mockBookings)

      expect(result.processed).toBe(2)
      expect(result.backfill).toBe(true)
      expect(googleCalendarService.createEvent).toHaveBeenCalledTimes(2)
    })

    it("should skip already synced bookings during backfill", async () => {
      const mockExistingSyncs = [
        {
          booking_id: "booking-1",
          status: "success",
          synced_at: new Date().toISOString(),
        },
      ]

      mockEq.mockResolvedValueOnce({
        data: mockExistingSyncs,
        error: null,
      })

      const { googleCalendarService } = require("../google-calendar")
      googleCalendarService.createEvent.mockResolvedValue("new-backfill-event")

      const result =
        await getCalendarSyncService().performInitialBackfill(mockBookings)

      expect(result.processed).toBe(1) // Only booking-2 should be processed
      expect(result.skipped).toBe(1) // booking-1 already synced
      expect(googleCalendarService.createEvent).toHaveBeenCalledTimes(1)
    })
  })

  describe("Idempotent Sync Behavior", () => {
    it("should sync same booking twice: createEvent ×1, updateEvent ×1", async () => {
      const { googleCalendarService } = require("../google-calendar")
      const booking = mockBookings[0]

      // First sync: no existing log, should create
      googleCalendarService.getSyncLog.mockResolvedValue(null)
      googleCalendarService.createEvent.mockResolvedValue("event-123")

      const firstResult = await getCalendarSyncService().syncBooking(booking)
      expect(firstResult).toBe("created")
      expect(googleCalendarService.createEvent).toHaveBeenCalledTimes(1)
      expect(googleCalendarService.updateEvent).toHaveBeenCalledTimes(0)

      // Reset mocks for second sync
      jest.clearAllMocks()

      // Second sync: existing log with event, should update
      googleCalendarService.getSyncLog.mockResolvedValue({
        gcal_event_id: "event-123",
      })
      googleCalendarService.eventExists.mockResolvedValue(true)
      googleCalendarService.updateEvent.mockResolvedValue(true)

      const secondResult = await getCalendarSyncService().syncBooking(booking)
      expect(secondResult).toBe("updated")
      expect(googleCalendarService.createEvent).toHaveBeenCalledTimes(0)
      expect(googleCalendarService.updateEvent).toHaveBeenCalledTimes(1)
    })

    it("should not call createEvent again on 429 error after log write", async () => {
      const { googleCalendarService } = require("../google-calendar")
      const booking = mockBookings[0]

      // First sync succeeds with createEvent and log write
      googleCalendarService.getSyncLog.mockResolvedValue(null)
      googleCalendarService.createEvent.mockResolvedValue("event-123")

      const firstResult = await getCalendarSyncService().syncBooking(booking)
      expect(firstResult).toBe("created")

      // Reset mocks
      jest.clearAllMocks()

      // Second sync: existing log, but updateEvent fails with 429
      googleCalendarService.getSyncLog.mockResolvedValue({
        gcal_event_id: "event-123",
      })
      googleCalendarService.eventExists.mockResolvedValue(true)

      const retryError = new Error("Rate limit exceeded") as any
      retryError.code = 429

      googleCalendarService.updateEvent
        .mockRejectedValueOnce(retryError)
        .mockRejectedValueOnce(retryError)
        .mockResolvedValueOnce(true)

      const secondResult = await getCalendarSyncService().syncBooking(booking)
      expect(secondResult).toBe("updated")

      // Should NOT call createEvent during retry, only updateEvent
      expect(googleCalendarService.createEvent).toHaveBeenCalledTimes(0)
      expect(googleCalendarService.updateEvent).toHaveBeenCalledTimes(3)
    }, 10000)

    it("should handle eventExists returning false with existing log (recreate behavior)", async () => {
      const { googleCalendarService } = require("../google-calendar")
      const booking = mockBookings[0]

      // Existing log but event doesn't exist in Google Calendar
      googleCalendarService.getSyncLog.mockResolvedValue({
        gcal_event_id: "old-event-123",
      })
      googleCalendarService.eventExists.mockResolvedValue(false)
      googleCalendarService.findEventByBookingUid.mockResolvedValue(null)
      googleCalendarService.createEvent.mockResolvedValue("new-event-456")

      const result = await getCalendarSyncService().syncBooking(booking)

      expect(result).toBe("created")
      expect(googleCalendarService.eventExists).toHaveBeenCalledWith(
        "old-event-123",
      )
      expect(googleCalendarService.findEventByBookingUid).toHaveBeenCalledWith(
        booking.uid,
      )
      expect(googleCalendarService.createEvent).toHaveBeenCalledTimes(1)
      expect(googleCalendarService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: booking.uid,
        }),
      )
    })

    it("should recover event via findEventByBookingUid when eventExists returns false", async () => {
      const { googleCalendarService } = require("../google-calendar")
      const booking = mockBookings[0]

      // Existing log with stale event ID, but event found via UID search
      googleCalendarService.getSyncLog.mockResolvedValue({
        gcal_event_id: "stale-event-123",
      })
      googleCalendarService.eventExists.mockResolvedValue(false)
      googleCalendarService.findEventByBookingUid.mockResolvedValue(
        "recovered-event-456",
      )
      googleCalendarService.updateEvent.mockResolvedValue(true)

      const result = await getCalendarSyncService().syncBooking(booking)

      expect(result).toBe("updated")
      expect(googleCalendarService.eventExists).toHaveBeenCalledWith(
        "stale-event-123",
      )
      expect(googleCalendarService.findEventByBookingUid).toHaveBeenCalledWith(
        booking.uid,
      )
      expect(googleCalendarService.updateEvent).toHaveBeenCalledWith(
        "recovered-event-456",
        expect.objectContaining({
          uid: booking.uid,
        }),
      )
    })
  })
})
