/**
 * Date utilities for consistent date handling across the booking system
 * All dates are interpreted as Costa Rica local time (UTC-6) to avoid timezone confusion
 */

// Costa Rica timezone offset (UTC-6)
const COSTA_RICA_OFFSET_HOURS = -6

/**
 * Normalize a date to noon (12:00) in Costa Rica timezone to avoid timezone and DST issues
 * This ensures date arithmetic works consistently regardless of server timezone
 */
export function normalizeToNoon(date: Date): Date {
  const normalized = new Date(date)
  // Set to 18:00 UTC (which is 12:00 in Costa Rica, UTC-6)
  normalized.setUTCHours(12 - COSTA_RICA_OFFSET_HOURS, 0, 0, 0)
  return normalized
}

/**
 * Parse an ISO date string as a Costa Rica local date
 * This ensures dates are interpreted consistently regardless of server timezone
 */
export function parsePropertyDate(isoString: string): Date {
  // Parse as UTC first, then compute Costa Rica calendar date
  const utcDate = new Date(isoString)
  const costaRicaMillis =
    utcDate.getTime() + COSTA_RICA_OFFSET_HOURS * 60 * 60 * 1000
  const costaRicaDate = new Date(costaRicaMillis)

  // Extract Costa Rica calendar date (year, month, day) in UTC
  const year = costaRicaDate.getUTCFullYear()
  const month = costaRicaDate.getUTCMonth()
  const day = costaRicaDate.getUTCDate()

  // Return Costa Rica calendar date at noon (18:00 UTC)
  return new Date(Date.UTC(year, month, day, 18, 0, 0, 0))
}

/**
 * Convert a Costa Rica local date to UTC ISO string for storage
 * This ensures dates are stored correctly in UTC
 */
export function toUTCISOString(date: Date): string {
  // Adjust from Costa Rica time back to UTC
  const utcTime = new Date(
    date.getTime() - COSTA_RICA_OFFSET_HOURS * 60 * 60 * 1000,
  )
  return utcTime.toISOString()
}

/**
 * Format date for user display in their locale
 * Always shows the date as it appears in Costa Rica
 */
export function formatForDisplay(date: Date, locale: string = "en"): string {
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Costa_Rica",
  })
}

/**
 * Format date for emails - shows Costa Rica local time clearly
 */
export function formatForEmail(date: Date, locale: string = "en"): string {
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Costa_Rica",
  })
}

/**
 * Create a date from year, month, day in Costa Rica timezone
 * Useful for user input processing
 */
export function createPropertyDate(
  year: number,
  month: number,
  day: number,
): Date {
  // Create date directly in UTC representing noon in Costa Rica (18:00 UTC)
  return new Date(Date.UTC(year, month - 1, day, 18, 0, 0, 0))
}

/**
 * Validate that a date is properly normalized (noon time in Costa Rica)
 */
export function isNormalized(date: Date): boolean {
  return (
    date.getUTCHours() === 18 && // 18:00 UTC = 12:00 Costa Rica (UTC-6)
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  )
}

/**
 * Ensure a date is normalized, normalizing it if necessary
 */
export function ensureNormalized(date: Date): Date {
  return isNormalized(date) ? date : normalizeToNoon(date)
}

/**
 * Validate that dates make sense for booking (check-out after check-in, not in past, etc.)
 */
export function validateBookingDates(
  checkIn: Date,
  checkOut: Date,
): { isValid: boolean; error?: string } {
  const now = normalizeToNoon(new Date())

  if (checkIn < now) {
    return { isValid: false, error: "Check-in date cannot be in the past" }
  }

  if (checkOut <= checkIn) {
    return {
      isValid: false,
      error: "Check-out date must be after check-in date",
    }
  }

  // Check that dates are properly normalized
  if (!isNormalized(checkIn) || !isNormalized(checkOut)) {
    return { isValid: false, error: "Dates are not properly normalized" }
  }

  return { isValid: true }
}

/**
 * Safely parse a date with fallback
 */
export function safeParsePropertyDate(
  isoString: string,
  fallback: Date = new Date(),
): Date {
  try {
    if (!isoString || isoString.trim() === "") {
      return normalizeToNoon(fallback)
    }
    const parsed = parsePropertyDate(isoString)
    return isNaN(parsed.getTime()) ? normalizeToNoon(fallback) : parsed
  } catch {
    return normalizeToNoon(fallback)
  }
}
