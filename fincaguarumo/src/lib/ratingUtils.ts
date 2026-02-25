/**
 * Centralized rating normalization utilities
 * Standardizes all ratings to 5-star system for consistency
 */

/**
 * Normalizes a rating to 5-star scale
 * - Booking.com: 1-10 → 1-5 (divide by 2, round up)
 * - Airbnb/Google: 1-5 → 1-5 (no change)
 */
export function normalizeRatingTo5Stars(rating: number, platform: string): number {
  if (!rating || rating <= 0) return 0
  
  switch (platform) {
    case 'booking':
      return Math.ceil(rating / 2)
    case 'airbnb':
    case 'google':
    default:
      return rating
  }
}

/**
 * Normalizes a rating to 10-point scale
 * - Booking.com: 1-10 → 1-10 (no change)
 * - Airbnb/Google: 1-5 → 1-10 (multiply by 2)
 */
export function normalizeRatingTo10Points(rating: number, platform: string): number {
  if (!rating || rating <= 0) return 0
  
  switch (platform) {
    case 'booking':
      return rating
    case 'airbnb':
    case 'google':
    default:
      return rating * 2
  }
}
