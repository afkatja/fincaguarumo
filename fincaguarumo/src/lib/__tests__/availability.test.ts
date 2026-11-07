import {
  fetchUnavailableRanges,
  checkAvailabilityRange,
  convertRangesToBlockedDates,
} from "../availability"

// Mock Supabase admin client
const mockBookingsData = [
  {
    uid: "airbnb-1",
    check_in: "2026-11-15T00:00:00",
    check_out: "2026-11-18T00:00:00",
    guest_name: "Airbnb (Not available)",
    source: "airbnb",
    is_test: false,
  },
  {
    uid: "direct-1",
    check_in: "2026-12-01 15:00:00",
    check_out: "2026-12-05 11:00:00",
    guest_name: "John Doe",
    source: "direct",
    is_test: false,
  },
  {
    uid: "60c2b07e3c8cf5ad39b6c6ad5871aebb@booking.com",
    check_in: "2026-11-05T06:00:00",
    check_out: "2028-05-05T06:00:00",
    guest_name: "CLOSED - Not available",
    source: "booking",
    is_test: false,
  },
  {
    uid: "test-booking",
    check_in: "2026-11-20T00:00:00",
    check_out: "2026-11-22T00:00:00",
    guest_name: "Test User",
    source: "direct",
    is_test: true,
  },
]

let mockQueryBuilder: any

jest.mock("../../lib/auth", () => ({
  createSupabaseAdmin: () => ({
    from: jest.fn(() => mockQueryBuilder),
  }),
}))

describe("Availability Service", () => {
  beforeEach(() => {
    mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      order: jest.fn().mockImplementation(() =>
        Promise.resolve({
          data: mockBookingsData.filter(
            b => !b.is_test && b.guest_name !== "CLOSED - Not available",
          ),
          error: null,
        }),
      ),
    }
  })

  describe("fetchUnavailableRanges", () => {
    it("should query bookings table, filter out CLOSED - Not available and test bookings, and slice at DB boundary", async () => {
      const ranges = await fetchUnavailableRanges()

      expect(ranges).toHaveLength(2)
      // Check date-only strings (no timestamps)
      expect(ranges[0]).toEqual({
        start: "2026-11-15",
        end: "2026-11-18",
        booking_uid: "airbnb-1",
        reason: "Booked via airbnb",
      })
      expect(ranges[1]).toEqual({
        start: "2026-12-01",
        end: "2026-12-05",
        booking_uid: "direct-1",
        reason: "Booked via direct",
      })

      // Ensure the 18-month CLOSED block is not included
      expect(ranges.some(r => r.booking_uid?.includes("booking.com"))).toBe(false)
    })
  })

  describe("checkAvailabilityRange", () => {
    it("should detect conflict when requested range overlaps with an existing booking", async () => {
      // Overlap with 2026-11-15 to 2026-11-18
      const result = await checkAvailabilityRange("2026-11-16", "2026-11-19")
      expect(result.isAvailable).toBe(false)
      expect(result.conflictingRanges).toHaveLength(1)
      expect(result.conflictingRanges[0].booking_uid).toBe("airbnb-1")
    })

    it("should allow back-to-back bookings (check-in on another guest's checkout day)", async () => {
      // airbnb-1 checks out on 2026-11-18
      const result = await checkAvailabilityRange("2026-11-18", "2026-11-22")
      expect(result.isAvailable).toBe(true)
      expect(result.conflictingRanges).toHaveLength(0)
    })

    it("should allow checkout on another guest's check-in day", async () => {
      // airbnb-1 checks in on 2026-11-15
      const result = await checkAvailabilityRange("2026-11-10", "2026-11-15")
      expect(result.isAvailable).toBe(true)
      expect(result.conflictingRanges).toHaveLength(0)
    })

    it("should handle full ISO string timestamps in checkIn and checkOut", async () => {
      const result = await checkAvailabilityRange(
        "2026-11-16T15:00:00.000Z",
        "2026-11-17T11:00:00.000Z",
      )
      expect(result.isAvailable).toBe(false)
      expect(result.conflictingRanges).toHaveLength(1)
    })
  })

  describe("convertRangesToBlockedDates", () => {
    it("should expand date ranges to daily YYYY-MM-DD strings (check-in inclusive, check-out exclusive)", () => {
      const ranges = [
        {
          start: "2026-11-15",
          end: "2026-11-18",
          booking_uid: "airbnb-1",
        },
      ]

      const blockedDates = convertRangesToBlockedDates(ranges)
      expect(blockedDates).toEqual([
        "2026-11-15",
        "2026-11-16",
        "2026-11-17",
      ])
      // Nov 18 is checkout day and must NOT be blocked
      expect(blockedDates).not.toContain("2026-11-18")
    })

    it("should return empty array for null or empty ranges", () => {
      expect(convertRangesToBlockedDates(null)).toEqual([])
      expect(convertRangesToBlockedDates([])).toEqual([])
    })
  })
})
