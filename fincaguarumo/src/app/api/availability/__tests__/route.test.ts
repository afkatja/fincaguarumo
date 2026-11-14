import { GET, POST } from "../route"
import * as availabilityLib from "@/lib/availability"

jest.mock("@/lib/availability", () => ({
  fetchUnavailableRanges: jest.fn(),
  convertRangesToBlockedDates: jest.fn(),
  convertRangesToCheckoutBlockedDates: jest.fn(),
  checkAvailabilityRange: jest.fn(),
}))

describe("Availability API Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("GET /api/availability", () => {
    it("should return blocked dates and ranges without triggering iCal sync", async () => {
      const mockRanges = [
        { start: "2026-11-15", end: "2026-11-18", booking_uid: "uid-1" },
      ]
      const mockBlockedDates = ["2026-11-15", "2026-11-16", "2026-11-17"]
      const mockCheckoutBlockedDates = ["2026-11-16", "2026-11-17", "2026-11-18"]

      ;(availabilityLib.fetchUnavailableRanges as jest.Mock).mockResolvedValue(
        mockRanges,
      )
      ;(
        availabilityLib.convertRangesToBlockedDates as jest.Mock
      ).mockReturnValue(mockBlockedDates)
      ;(
        availabilityLib.convertRangesToCheckoutBlockedDates as jest.Mock
      ).mockReturnValue(mockCheckoutBlockedDates)

      const response = await GET()
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toEqual({
        blockedDates: mockBlockedDates,
        checkoutBlockedDates: mockCheckoutBlockedDates,
        ranges: mockRanges,
        unavailableRanges: mockRanges,
      })

      expect(availabilityLib.fetchUnavailableRanges).toHaveBeenCalledTimes(1)
      expect(availabilityLib.convertRangesToBlockedDates).toHaveBeenCalledWith(
        mockRanges,
      )
      expect(
        availabilityLib.convertRangesToCheckoutBlockedDates,
      ).toHaveBeenCalledWith(mockRanges)
    })
  })

  describe("POST /api/availability", () => {
    it("should return 400 if checkIn or checkOut is missing or not a valid date", async () => {
      const req = new Request("http://localhost/api/availability", {
        method: "POST",
        body: JSON.stringify({ checkIn: "2026-11-15" }),
      })

      const response = await POST(req)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe("checkIn and checkOut must be valid YYYY-MM-DD dates")
    })

    it("should return 400 for non-string checkIn or checkOut", async () => {
      const req = new Request("http://localhost/api/availability", {
        method: "POST",
        body: JSON.stringify({ checkIn: 123, checkOut: "2026-11-22" }),
      })

      const response = await POST(req)
      expect(response.status).toBe(400)
    })

    it("should return 400 if checkOut is not strictly after checkIn", async () => {
      for (const [checkIn, checkOut] of [
        ["2026-11-22", "2026-11-22"],
        ["2026-11-22", "2026-11-18"],
      ]) {
        const req = new Request("http://localhost/api/availability", {
          method: "POST",
          body: JSON.stringify({ checkIn, checkOut }),
        })
        const response = await POST(req)
        expect(response.status).toBe(400)
      }
    })

    it("should run overlap checks only for validated input", async () => {
      const mockResult = {
        isAvailable: true,
        conflictingRanges: [],
        bookingConflicts: [],
      }
      ;(availabilityLib.checkAvailabilityRange as jest.Mock).mockResolvedValue(
        mockResult,
      )

      const req = new Request("http://localhost/api/availability", {
        method: "POST",
        body: JSON.stringify({
          checkIn: "2026-11-18",
          checkOut: "2026-11-22",
        }),
      })

      const response = await POST(req)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toEqual(mockResult)
      expect(availabilityLib.checkAvailabilityRange).toHaveBeenCalledWith(
        "2026-11-18",
        "2026-11-22",
      )
    })
  })
})
