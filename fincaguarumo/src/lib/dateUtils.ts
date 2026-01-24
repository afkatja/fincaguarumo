/**
 * Date utilities for consistent date handling across the booking system
 * All dates are interpreted as Costa Rica local time (UTC-6) to avoid timezone confusion
 */

// Costa Rica timezone offset (UTC-6)
const COSTA_RICA_OFFSET_HOURS = -6

/**
 * Normalize a date to noon (12:00) to avoid timezone and DST issues
 * This ensures date arithmetic works consistently regardless of timezone
 */
export function normalizeToNoon(date: Date): Date {
  const normalized = new Date(date)
  normalized.setHours(12, 0, 0, 0)
  return normalized
}

/**
 * Parse an ISO date string as a Costa Rica local date
 * This ensures dates are interpreted consistently regardless of server timezone
 */
export function parsePropertyDate(isoString: string): Date {
  // Parse as UTC first, then adjust to Costa Rica time
  const utcDate = new Date(isoString)
  const costaRicaTime = new Date(
    utcDate.getTime() + COSTA_RICA_OFFSET_HOURS * 60 * 60 * 1000,
  )
  return normalizeToNoon(costaRicaTime)
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
  // Create date in Costa Rica timezone
  const date = new Date(year, month - 1, day)
  date.setHours(12, 0, 0, 0)
  return date
}

/**
 * Validate that a date is properly normalized (noon time)
 */
export function isNormalized(date: Date): boolean {
  return (
    date.getHours() === 12 &&
    date.getMinutes() === 0 &&
    date.getSeconds() === 0 &&
    date.getMilliseconds() === 0
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
