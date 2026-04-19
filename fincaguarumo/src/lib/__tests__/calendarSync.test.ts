import { syncBookingsToCalendar, calendarSyncService } from "../calendar-sync"
import { Booking } from "../setBookings"

// Mock Supabase client factory
const createMockSupabase = () => ({
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        data: [],
        error: null,
      })),
      single: jest.fn(() => ({
        data: null,
        error: null,
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        data: [{ id: "sync-log-123" }],
        error: null,
      })),
    })),
    upsert: jest.fn(() => ({
      select: jest.fn(() => ({
        data: [{ id: "sync-log-456" }],
        error: null,
      })),
    })),
  })),
})

let mockSupabase: ReturnType<typeof createMockSupabase>

// Mock the Google Calendar service
jest.mock("../google-calendar", () => ({
  syncBookingToCalendar: jest.fn(),
}))

// Mock Supabase createClient
jest.mock("@supabase/supabase-js", () => {
  let mockSupabase: any
  return {
    createClient: jest.fn(() => mockSupabase),
    __setMockSupabase: (mock: any) => {
      mockSupabase = mock
    },
  }
})

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
    mockSupabase = createMockSupabase()
    const supabaseMock = require("@supabase/supabase-js")
    supabaseMock.__setMockSupabase(mockSupabase)
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key"
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

      const result = await calendarSyncService.fetchBookingsFromAPI()

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
      const { syncBookingToCalendar } = require("../google-calendar")
      syncBookingToCalendar.mockResolvedValue({
        checkinEventId: "event-123",
        checkoutEventId: "event-456",
        status: "created",
      })

      const result = await syncBookingsToCalendar(mockBookings)

      expect(result.processed).toBe(2)
      expect(result.success).toBe(2)
      expect(result.failed).toBe(0)
      expect(syncBookingToCalendar).toHaveBeenCalledTimes(2)
    })

    it("should handle booking updates in calendar (AC3)", async () => {
      const { syncBookingToCalendar } = require("../google-calendar")
      syncBookingToCalendar.mockResolvedValue({
        checkinEventId: "updated-event-123",
        checkoutEventId: "updated-event-456",
        status: "updated",
      })

      const result = await syncBookingsToCalendar(mockBookings)

      expect(result.processed).toBe(2)
      expect(result.updated).toBe(2)
      expect(result.created).toBe(0)
    })

    it("should handle cancelled bookings by removing from calendar (AC3)", async () => {
      const { syncBookingToCalendar } = require("../google-calendar")
      syncBookingToCalendar.mockResolvedValue({
        status: "deleted",
        checkinEventId: null,
        checkoutEventId: null,
      })

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
      const mockSyncResult = {
        checkinEventId: "event-123",
        checkoutEventId: "event-456",
        status: "created" as const,
      }

      await calendarSyncService.recordSyncState("booking-1", mockSyncResult)

      expect(mockSupabase.from).toHaveBeenCalledWith("gcal_sync_log")
      expect(mockSupabase.from().upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            booking_id: "booking-1",
            gcal_checkin_event_id: "event-123",
            gcal_checkout_event_id: "event-456",
            sync_status: "success",
            synced_at: expect.any(String),
          }),
        ]),
        expect.any(Object),
      )
    })

    it("should update existing sync records", async () => {
      const mockExistingSync = [
        {
          id: "existing-sync-123",
          booking_id: "booking-1",
          gcal_checkin_event_id: "old-event-123",
          gcal_checkout_event_id: "old-event-456",
          sync_status: "pending",
        },
      ]

      const selectEqMock = jest.fn().mockResolvedValueOnce({
        data: mockExistingSync,
        error: null,
      })
      mockSupabase.from().select().eq = selectEqMock

      const mockUpdatedSync = {
        checkinEventId: "new-event-123",
        checkoutEventId: "new-event-456",
        status: "updated" as const,
      }

      await calendarSyncService.recordSyncState("booking-1", mockUpdatedSync)

      expect(mockSupabase.from().upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: "existing-sync-123",
            booking_id: "booking-1",
            gcal_checkin_event_id: "new-event-123",
            gcal_checkout_event_id: "new-event-456",
            sync_status: "success",
          }),
        ]),
        expect.any(Object),
      )
    })
  })

  describe("Idempotency (TR6)", () => {
    it("should use existing gcal_event_id for updates", async () => {
      const mockExistingSync = [
        {
          booking_id: "booking-1",
          gcal_checkin_event_id: "existing-checkin-event",
          gcal_checkout_event_id: "existing-checkout-event",
          sync_status: "success",
        },
      ]

      const selectEqMock = jest.fn().mockResolvedValueOnce({
        data: mockExistingSync,
        error: null,
      })
      mockSupabase.from().select().eq = selectEqMock

      const { syncBookingToCalendar } = require("../google-calendar")
      syncBookingToCalendar.mockResolvedValue({
        checkinEventId: "existing-checkin-event",
        checkoutEventId: "existing-checkout-event",
        status: "updated",
      })

      await syncBookingsToCalendar([mockBookings[0]])

      expect(syncBookingToCalendar).toHaveBeenCalledWith(
        mockBookings[0],
        expect.objectContaining({
          checkinEventId: "existing-checkin-event",
          checkoutEventId: "existing-checkout-event",
        }),
      )
    })
  })

  describe("Error Handling and Retry Logic (Edge Cases)", () => {
    it("should handle API failures gracefully", async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error"),
      )

      const result = await calendarSyncService.fetchBookingsFromAPI()

      expect(result).toEqual([])
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to fetch bookings"),
      )
    })

    it("should implement exponential backoff for calendar API failures", async () => {
      const { syncBookingToCalendar } = require("../google-calendar")
      const retryError = new Error("Rate limit exceeded") as any
      retryError.code = 429

      syncBookingToCalendar
        .mockRejectedValueOnce(retryError)
        .mockRejectedValueOnce(retryError)
        .mockResolvedValueOnce({
          checkinEventId: "retry-success-event",
          checkoutEventId: "retry-success-event",
          status: "created",
        })

      const result = await syncBookingsToCalendar([mockBookings[0]])

      expect(result.success).toBe(1)
      expect(result.retries).toBe(2)
      expect(syncBookingToCalendar).toHaveBeenCalledTimes(3)
    })

    it("should handle partial sync failures", async () => {
      const { syncBookingToCalendar } = require("../google-calendar")
      syncBookingToCalendar
        .mockResolvedValueOnce({
          checkinEventId: "success-event-1",
          checkoutEventId: "success-event-2",
          status: "created",
        })
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
        sync_status: "success",
      }

      const selectEqMock = jest.fn().mockResolvedValueOnce({
        data: mockSyncRecord,
        error: null,
      })
      mockSupabase.from().select().eq = selectEqMock

      const shouldSync = await calendarSyncService.shouldRunSync()

      expect(shouldSync).toBe(false) // Should not sync yet (only 10 minutes passed)
    })

    it("should trigger sync when 15 minutes have passed", async () => {
      const lastSyncTime = new Date(Date.now() - 20 * 60 * 1000) // 20 minutes ago
      const mockSyncRecord = {
        synced_at: lastSyncTime.toISOString(),
        sync_status: "success",
      }

      const selectEqMock = jest.fn().mockResolvedValueOnce({
        data: mockSyncRecord,
        error: null,
      })
      mockSupabase.from().select().eq = selectEqMock

      const shouldSync = await calendarSyncService.shouldRunSync()

      expect(shouldSync).toBe(true) // Should sync (20 minutes passed > 15 minutes)
    })
  })

  describe("Initial Backfill (TR10)", () => {
    it("should handle initial backfill for existing bookings", async () => {
      const { syncBookingToCalendar } = require("../google-calendar")
      syncBookingToCalendar.mockResolvedValue({
        checkinEventId: "backfill-event-1",
        checkoutEventId: "backfill-event-2",
        status: "created",
      })

      const result =
        await calendarSyncService.performInitialBackfill(mockBookings)

      expect(result.processed).toBe(2)
      expect(result.backfill).toBe(true)
      expect(syncBookingToCalendar).toHaveBeenCalledTimes(2)
    })

    it("should skip already synced bookings during backfill", async () => {
      const mockExistingSyncs = [
        {
          booking_id: "booking-1",
          sync_status: "success",
          synced_at: new Date().toISOString(),
        },
      ]

      const selectEqMock = jest.fn().mockResolvedValueOnce({
        data: mockExistingSyncs,
        error: null,
      })
      mockSupabase.from().select().eq = selectEqMock

      const { syncBookingToCalendar } = require("../google-calendar")
      syncBookingToCalendar.mockResolvedValue({
        checkinEventId: "new-backfill-event",
        checkoutEventId: "new-backfill-event-2",
        status: "created",
      })

      const result =
        await calendarSyncService.performInitialBackfill(mockBookings)

      expect(result.processed).toBe(1) // Only booking-2 should be processed
      expect(result.skipped).toBe(1) // booking-1 already synced
    })
  })
})
