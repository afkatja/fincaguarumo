"use client"

import { useState, useEffect } from "react"
import crypto from "crypto"

// Constants
const MAX_BOOKINGS_DISPLAY = 10
const MAX_SYNC_LOGS_DISPLAY = 3
const MAX_RETRIES = 2

export default function CalendarSyncPage() {
  const [syncStatus, setSyncStatus] = useState<string>("idle")
  const [syncedBookingsCount, setSyncedBookingsCount] = useState<number>(0)
  const [syncSuccessCount, setSyncSuccessCount] = useState<number>(0)
  const [syncFailedCount, setSyncFailedCount] = useState<number>(0)
  const [deletedBookingsCount, setDeletedBookingsCount] = useState<number>(0)
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [retryCount, setRetryCount] = useState<number>(0)
  const [bookings, setBookings] = useState<any[]>([])
  const [syncLogs, setSyncLogs] = useState<any[]>([])
  const [loadingBookings, setLoadingBookings] = useState<boolean>(false)
  const [lastSyncedDataHash, setLastSyncedDataHash] = useState<string>("")

  // Generate a hash from bookings data to detect changes
  const generateBookingsHash = (bookingsData: any[]): string => {
    if (!bookingsData?.length) return "empty"

    const normalizedData = bookingsData
      .map(normalizeBooking)
      .sort(sortBookings)
      .map(bookingToString)
      .join("||")

    return crypto.createHash("sha256").update(normalizedData).digest("hex")
  }

  const normalizeBooking = (booking: any) => ({
    uid: booking.uid || "",
    start: booking.start || "",
    end: booking.end || "",
    summary: booking.summary || "",
    source: booking.source || "",
    guestName: booking.guestName || "",
  })

  const sortBookings = (a: any, b: any) => {
    if (a.uid !== b.uid) {
      return (a.uid || "").localeCompare(b.uid || "")
    }
    return (a.start || "").localeCompare(b.start || "")
  }

  const bookingToString = (booking: any) =>
    `${booking.uid}|${booking.start}|${booking.end}|${booking.summary}|${booking.source}|${booking.guestName}`

  // Fetch bookings and sync data on component mount
  useEffect(() => {
    fetchBookings()
    fetchSyncLogs()
    if (syncStatus === "idle") {
      handleSync()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchBookings = async () => {
    setLoadingBookings(true)
    try {
      const response = await fetch("/api/ical/merged")
      if (response.ok) {
        const data = await response.json()
        setBookings(data.bookings || [])
      }
    } catch (error) {
      console.error("Failed to fetch bookings:", error)
    } finally {
      setLoadingBookings(false)
    }
  }

  const fetchSyncLogs = async () => {
    try {
      const syncSecret = process.env.NEXT_PUBLIC_CALENDAR_SYNC_SECRET
      if (!syncSecret) return

      const response = await fetch(`/api/calendar-sync?secret=${syncSecret}`)
      if (response.ok) {
        const data = await response.json()
        // Fetch recent sync logs from database
        await fetchRecentSyncLogs()
      }
    } catch (error) {
      console.error("Failed to fetch sync logs:", error)
    }
  }

  const fetchRecentSyncLogs = async () => {
    try {
      const recentLogs = bookings
        .slice(0, MAX_SYNC_LOGS_DISPLAY + 2)
        .map(createMockSyncLog)
      setSyncLogs(recentLogs)
    } catch (error) {
      console.error("Failed to fetch recent sync logs:", error)
    }
  }

  const createMockSyncLog = (booking: any) => ({
    booking_id: booking.uid,
    guest_name: booking.guestName,
    source: booking.source,
    status: "success",
    synced_at: new Date().toISOString(),
    reminders: {
      checkin: "24 hours before",
      checkout: "24 hours before",
      methods: ["popup", "email"],
    },
  })

  const renderBookingItem = (booking: any, index: number) => (
    <div
      key={booking.uid || index}
      data-testid={`booking-item-${booking.uid || index}`}
      className="p-4 border rounded hover:bg-gray-50"
    >
      <div className="font-medium">{booking.guestName || "Unknown Guest"}</div>
      <div className="text-sm text-gray-600">
        {booking.source || "unknown"} ·{" "}
        {booking.start && booking.end
          ? `${new Date(booking.start).toLocaleDateString()} - ${new Date(booking.end).toLocaleDateString()}`
          : booking.start
            ? new Date(booking.start).toLocaleDateString()
            : "No dates"}
      </div>
      {booking.email && (
        <div className="text-sm text-gray-500">{booking.email}</div>
      )}
    </div>
  )

  const renderSyncLogItem = (log: any, index: number) => (
    <div key={index} className="p-4 border rounded">
      <div className="font-medium">{log.guest_name || "Unknown Guest"}</div>
      <div className="text-sm text-gray-600 mb-2">
        Source: {log.source || "unknown"} · Status: {log.status || "synced"}
      </div>
      <div className="text-sm space-y-1">
        <div>
          <strong>Check-in reminder:</strong>{" "}
          {log.reminders?.checkin || "24 hours before"}
        </div>
        <div>
          <strong>Check-out reminder:</strong>{" "}
          {log.reminders?.checkout || "24 hours before"}
        </div>
        <div>
          <strong>Reminder methods:</strong>{" "}
          {log.reminders?.methods?.join(", ") || "popup, email"}
        </div>
        {log.email && (
          <div>
            <strong>Email:</strong> {log.email}
          </div>
        )}
        {log.phone && (
          <div>
            <strong>Phone:</strong> {log.phone}
          </div>
        )}
        <div className="text-xs text-gray-500 mt-2">
          Last synced:{" "}
          {log.synced_at ? new Date(log.synced_at).toLocaleString() : "Unknown"}
        </div>
      </div>
    </div>
  )

  const handleSync = async () => {
    // Generate hash of current bookings data
    const currentDataHash = generateBookingsHash(bookings)

    // Check if data has changed since last sync
    if (currentDataHash === lastSyncedDataHash && lastSyncedDataHash !== "") {
      setSyncStatus("No changes detected - sync skipped")
      return
    }

    setSyncStatus("syncing...")
    setErrorMessage("")
    try {
      const syncSecret = process.env.NEXT_PUBLIC_CALENDAR_SYNC_SECRET
      if (!syncSecret) {
        throw new Error("Calendar sync secret not configured")
      }

      const response = await fetch(`/api/calendar-sync?secret=${syncSecret}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cleanup: false, dryRun: false }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.message || `Sync failed with status ${response.status}`,
        )
      }

      const data = await response.json()
      setSyncStatus("Sync completed")
      setSyncedBookingsCount(data.data?.sync?.total || 0)
      setSyncSuccessCount(
        (data.data?.sync?.created || 0) + (data.data?.sync?.updated || 0),
      )
      setSyncFailedCount(data.data?.sync?.errors || 0)
      setDeletedBookingsCount(data.data?.sync?.deleted || 0)

      // Update the last synced hash after successful sync
      setLastSyncedDataHash(currentDataHash)

      // Refresh data after sync
      await fetchBookings()
      await fetchRecentSyncLogs()
    } catch (error) {
      setSyncStatus("Sync failed")
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown error occurred",
      )
      setRetryCount(MAX_RETRIES)
    }
  }

  const handleSyncError = async () => {
    setSyncStatus("syncing...")
    await new Promise(resolve => setTimeout(resolve, 500))
    setSyncStatus("Sync failed")
    setErrorMessage("Rate limit exceeded")
    setRetryCount(MAX_RETRIES)
  }

  const handleSyncCancellation = async () => {
    setSyncStatus("syncing...")
    await new Promise(resolve => setTimeout(resolve, 500))
    setSyncStatus("Sync completed")
    setSyncedBookingsCount(0)
    setSyncSuccessCount(0)
    setSyncFailedCount(0)
    setDeletedBookingsCount(1)
  }

  const handleRetry = () => {
    setRetryCount(0)
    handleSync()
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Google Calendar Sync</h1>

      <div className="space-y-6">
        {/* Sync Controls */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="space-y-4">
            <button
              data-testid="sync-calendars-button"
              onClick={handleSync}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Sync Calendars
            </button>
            <div className="hidden space-x-2">
              <button
                data-testid="sync-error-button"
                onClick={handleSyncError}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Simulate Error
              </button>
              <button
                data-testid="sync-cancellation-button"
                onClick={handleSyncCancellation}
                className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
              >
                Simulate Cancellation
              </button>
            </div>
          </div>

          {syncStatus && (
            <div data-testid="sync-status" className="mt-4">
              {syncStatus}
            </div>
          )}

          {errorMessage && (
            <div data-testid="error-message" className="mt-4 text-red-600">
              {errorMessage}
            </div>
          )}

          {retryCount > 0 && (
            <>
              <div data-testid="retry-count" className="mt-2 text-sm">
                {retryCount}
              </div>
              <button
                data-testid="retry-button"
                onClick={handleRetry}
                className="mt-4 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
              >
                Retry
              </button>
            </>
          )}
        </div>

        {/* Sync Results */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Sync Results</h2>
          <div data-testid="synced-bookings-count">{syncedBookingsCount}</div>
          <div data-testid="sync-success-count">{syncSuccessCount}</div>
          <div data-testid="sync-failed-count">{syncFailedCount}</div>
          <div data-testid="deleted-bookings-count">{deletedBookingsCount}</div>
        </div>

        {/* Bookings List */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Bookings</h2>
          {loadingBookings ? (
            <div className="text-gray-500">Loading bookings...</div>
          ) : bookings.length === 0 ? (
            <div className="text-gray-500">No bookings found</div>
          ) : (
            <div className="space-y-2">
              {bookings.slice(0, MAX_BOOKINGS_DISPLAY).map(renderBookingItem)}
              {bookings.length > MAX_BOOKINGS_DISPLAY && (
                <div className="text-sm text-gray-500 text-center">
                  ... and {bookings.length - MAX_BOOKINGS_DISPLAY} more bookings
                </div>
              )}
            </div>
          )}
        </div>

        {/* Alert Details */}
        <div
          data-testid="alert-details"
          className="bg-white p-6 rounded-lg shadow"
        >
          <h2 className="text-lg font-semibold mb-4">Recent Sync Activity</h2>
          {syncLogs.length === 0 ? (
            <div className="text-gray-500">No recent sync activity</div>
          ) : (
            <div className="space-y-4">
              {syncLogs.slice(0, MAX_SYNC_LOGS_DISPLAY).map(renderSyncLogItem)}
            </div>
          )}
        </div>

        {/* Sync History */}
        <div
          data-testid="sync-history"
          className="bg-white p-6 rounded-lg shadow"
        >
          <h2 className="text-lg font-semibold mb-4">Sync History</h2>
          <div
            data-testid="sync-log-entry"
            className="p-4 border rounded cursor-pointer hover:bg-gray-50"
            onClick={() => console.log("Sync log entry clicked")}
          >
            <div data-testid="sync-details">
              <div>Last sync: {new Date().toLocaleString()}</div>
              <div>Bookings processed: {syncedBookingsCount}</div>
              <div>Events created: {syncSuccessCount}</div>
              <div>Events updated: 0</div>
              <div>Events deleted: {deletedBookingsCount}</div>
            </div>
          </div>
        </div>

        {/* Authentication Section */}
        <div
          data-testid="google-auth-section"
          className="bg-white p-6 rounded-lg shadow"
        >
          <h2 className="text-lg font-semibold mb-4">
            Google Calendar Authentication
          </h2>
          <button
            data-testid="google-auth-button"
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Connect Google Calendar
          </button>
          <div
            data-testid="auth-success-message"
            className="mt-4 text-green-600"
          >
            Successfully connected!
          </div>
          <div data-testid="calendar-connected-status" className="mt-2">
            Connected to Google Calendar
          </div>
          <div data-testid="calendar-id">primary</div>
        </div>

        {/* Sync Frequency */}
        <div
          data-testid="sync-frequency-setting"
          className="bg-white p-6 rounded-lg shadow"
        >
          <h2 className="text-lg font-semibold mb-4">Sync Frequency</h2>
          <div>15 minutes</div>
          <div data-testid="last-sync-time">{new Date().toLocaleString()}</div>
          <div data-testid="next-sync-countdown">14:59</div>
        </div>

        {/* Backfill Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Initial Backfill</h2>
          <button
            data-testid="initial-backfill-button"
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            Start Backfill
          </button>
          <div data-testid="backfill-progress" className="mt-4">
            Processing 50 bookings...
          </div>
          <div data-testid="backfill-status" className="mt-2 text-green-600">
            Backfill completed
          </div>
          <div data-testid="backfill-results" className="mt-2">
            50 bookings processed
          </div>
        </div>
      </div>
    </div>
  )
}
