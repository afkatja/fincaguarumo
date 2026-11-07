import { GET, POST } from "../route"
import { calendarSyncService } from "@/lib/calendar-sync"
import { googleCalendarService } from "@/lib/google-calendar"
import { verifyAdminAuth } from "@/lib/auth"

jest.mock("@/lib/auth", () => ({
  verifyAdminAuth: jest.fn(),
  createSupabaseAdmin: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
  })),
}))

jest.mock("@/lib/calendar-sync", () => ({
  calendarSyncService: {
    getSyncStats: jest.fn(),
    syncAllBookings: jest.fn(),
    cleanupOldLogs: jest.fn(),
    fetchBookings: jest.fn(),
  },
}))

jest.mock("@/lib/google-calendar", () => ({
  googleCalendarService: {
    testAccess: jest.fn(),
  },
}))

describe("Admin Calendar Sync Route", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(verifyAdminAuth as jest.Mock).mockResolvedValue({
      id: "admin-1",
      email: "admin@example.com",
      is_admin: true,
    })
  })

  describe("GET /api/admin/calendar-sync", () => {
    it("should call calendarSyncService and googleCalendarService directly without HTTP proxying", async () => {
      ;(calendarSyncService.getSyncStats as jest.Mock).mockResolvedValue({
        lastSyncTime: "2026-11-07T00:00:00.000Z",
        totalBookings: 5,
      })
      ;(googleCalendarService.testAccess as jest.Mock).mockResolvedValue(true)

      const req = new Request("http://localhost/api/admin/calendar-sync")
      const response = await GET(req)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.status).toBe("success")
      expect(data.requestedBy).toBe("admin@example.com")
      expect(data.data.sync.totalBookings).toBe(5)
      expect(data.data.calendar.accessible).toBe(true)

      expect(calendarSyncService.getSyncStats).toHaveBeenCalledTimes(1)
      expect(googleCalendarService.testAccess).toHaveBeenCalledTimes(1)
    })
  })

  describe("POST /api/admin/calendar-sync", () => {
    it("should trigger syncAllBookings directly", async () => {
      ;(googleCalendarService.testAccess as jest.Mock).mockResolvedValue(true)
      ;(calendarSyncService.syncAllBookings as jest.Mock).mockResolvedValue({
        total: 5,
        created: 2,
        updated: 3,
        deleted: 0,
        errors: 0,
      })

      const req = new Request("http://localhost/api/admin/calendar-sync", {
        method: "POST",
        body: JSON.stringify({ cleanup: false, dryRun: false, force: true }),
      })

      const response = await POST(req)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.status).toBe("success")
      expect(data.data.sync.created).toBe(2)
      expect(calendarSyncService.syncAllBookings).toHaveBeenCalledTimes(1)
    })
  })
})
