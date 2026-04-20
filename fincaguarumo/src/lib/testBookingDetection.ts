/**
 * Helper function to detect if a booking is a test booking
 * This module doesn't depend on Sanity and can be used in standalone scripts
 */
export function isTestBooking(uid: string, guestName?: string, email?: string): boolean {
  console.log("isTestBooking", uid, guestName, email)
  
  // Check for test indicators in UID
  const testUidPatterns = [
    /test/i,
    /demo/i,
    /sample/i,
    /mock/i,
    /debug/i,
    /^cs_/, // Stripe test payment intents start with cs_test_ or cs_
    /^pi_test_/,
    /^acct_test_/,
  ]

  const uidMatch = testUidPatterns.some(pattern => pattern.test(uid))
  if (uidMatch) return true

  // Check for test indicators in guest name
  if (guestName) {
    const testNamePatterns = [
      /test/i,
      /demo/i,
      /sample/i,
      /mock/i,
      /debug/i,
      /test user/i,
      /demo user/i,
      /john doe/i,
      /jane doe/i,
      /joe doe/i,
    ]

    const nameMatch = testNamePatterns.some(pattern => pattern.test(guestName))
    console.log("nameMatch", guestName, nameMatch)
    if (nameMatch) return true
  }

  // Check for test indicators in email
  if (email) {
    const testEmailPatterns = [
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
      /\john@doe\./i,
      /\jane@doe\./i,
      /\johndoe\./i,
      /\janedoe\./i,
    ]

    const emailMatch = testEmailPatterns.some(pattern => pattern.test(email))
    if (emailMatch) return true
  }

  // Check for test environment
  if (process.env.NODE_ENV === "test") {
    return true
  }

  return false
}
