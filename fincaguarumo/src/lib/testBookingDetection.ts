/**
 * Helper function to detect if a booking is a test booking
 * This module doesn't depend on Sanity and can be used in standalone scripts
 */

// Constants for test patterns
const COMMON_TEST_PATTERNS = [/test/i, /demo/i, /sample/i, /mock/i, /debug/i]
const STRIPE_TEST_PATTERNS = [/^cs_/, /^pi_test_/, /^acct_test_/]
const NAME_TEST_PATTERNS = [
  ...COMMON_TEST_PATTERNS,
  /test user/i,
  /demo user/i,
  /john doe/i,
  /jane doe/i,
  /joe doe/i,
]
const EMAIL_TEST_PATTERNS = [
  /test\./i,
  /demo\./i,
  /sample\./i,
  /mock\./i,
  /@test\./i,
  /@demo\./i,
  /@example\./i,
  /\.test@/i,
  /\.demo@/i,
  /\.example@/i,
  /john@doe\./i,
  /jane@doe\./i,
  /johndoe\./i,
  /janedoe\./i,
]

function matchesPatterns(value: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(value))
}

export function isTestBooking(
  uid: string,
  guestName?: string,
  email?: string,
): boolean {
  console.log("isTestBooking", uid, guestName, email)

  // Check for test indicators in UID
  if (
    matchesPatterns(uid, [...COMMON_TEST_PATTERNS, ...STRIPE_TEST_PATTERNS])
  ) {
    return true
  }

  // Check for test indicators in guest name
  if (guestName && matchesPatterns(guestName, NAME_TEST_PATTERNS)) {
    console.log("nameMatch", guestName, true)
    return true
  }

  // Check for test indicators in email
  if (email && matchesPatterns(email, EMAIL_TEST_PATTERNS)) {
    return true
  }

  // Check for test environment
  if (process.env.NODE_ENV === "test") {
    return true
  }

  return false
}
