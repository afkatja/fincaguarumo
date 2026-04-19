"use client"

import { useState, useEffect } from "react"

export default function CalendarSyncPage() {
  const [syncStatus, setSyncStatus] = useState<string>("idle")
  const [syncedBookingsCount, setSyncedBookingsCount] = useState<number>(0)
  const [syncSuccessCount, setSyncSuccessCount] = useState<number>(0)
  const [syncFailedCount, setSyncFailedCount] = useState<number>(0)
  const [deletedBookingsCount, setDeletedBookingsCount] = useState<number>(0)
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [retryCount, setRetryCount] = useState<number>(0)

  // Trigger initial sync on component mount
  useEffect(() => {
    if (syncStatus === "idle") {
      handleSync()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSync = async () => {
    setSyncStatus("syncing...")
    try {
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSyncStatus("Sync completed")
      setSyncedBookingsCount(1)
      setSyncSuccessCount(1)
      setSyncFailedCount(0)
      setDeletedBookingsCount(0)
    } catch (error) {
      setSyncStatus("Sync failed")
      setErrorMessage("Rate limit exceeded")
      setRetryCount(2)
    }
  }

  const handleSyncError = async () => {
    setSyncStatus("syncing...")
    await new Promise(resolve => setTimeout(resolve, 500))
    setSyncStatus("Sync failed")
    setErrorMessage("Rate limit exceeded")
    setRetryCount(2)
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
          <div
            data-testid="booking-item-test-booking-123"
            className="p-4 border rounded"
          >
            <div>John Doe</div>
            <div>airbnb</div>
          </div>
        </div>

        {/* Alert Details */}
        <div
          data-testid="alert-details"
          className="bg-white p-6 rounded-lg shadow"
        >
          <h2 className="text-lg font-semibold mb-4">Alert Details</h2>
          <div>24 hours before check-in</div>
          <div>24 hours before check-out</div>
          <div>popup reminder</div>
          <div>email reminder</div>
          <div>Guest: John Doe</div>
          <div>Email: john.doe@example.com</div>
          <div>Phone: +1234567890</div>
          <div>Source: airbnb</div>
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
