import { isChatbotEnabled, isFeatureEnabled } from "../featureFlags"

// Mock process.env
const originalEnv = process.env

describe("Feature Flags", () => {
  beforeEach(() => {
    // Reset process.env before each test
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    // Restore original process.env
    process.env = originalEnv
  })

  describe("isFeatureEnabled", () => {
    test("should return true when feature flag is set to 'true'", () => {
      process.env.NEXT_PUBLIC_TEST_FEATURE = "true"
      expect(isFeatureEnabled("TEST_FEATURE")).toBe(true)
    })

    test("should return false when feature flag is set to 'false'", () => {
      process.env.NEXT_PUBLIC_TEST_FEATURE = "false"
      expect(isFeatureEnabled("TEST_FEATURE")).toBe(false)
    })

    test("should return false when feature flag is undefined", () => {
      delete process.env.NEXT_PUBLIC_TEST_FEATURE
      expect(isFeatureEnabled("TEST_FEATURE")).toBe(false)
    })

    test("should return false when feature flag has any other value", () => {
      process.env.NEXT_PUBLIC_TEST_FEATURE = "enabled"
      expect(isFeatureEnabled("TEST_FEATURE")).toBe(false)
    })
  })

  describe("isChatbotEnabled", () => {
    test("should return true when NEXT_PUBLIC_CHATBOT_ENABLED is 'true'", () => {
      process.env.NEXT_PUBLIC_CHATBOT_ENABLED = "true"
      expect(isChatbotEnabled()).toBe(true)
    })

    test("should return false when NEXT_PUBLIC_CHATBOT_ENABLED is 'false'", () => {
      process.env.NEXT_PUBLIC_CHATBOT_ENABLED = "false"
      expect(isChatbotEnabled()).toBe(false)
    })

    test("should return false when NEXT_PUBLIC_CHATBOT_ENABLED is undefined", () => {
      delete process.env.NEXT_PUBLIC_CHATBOT_ENABLED
      expect(isChatbotEnabled()).toBe(false)
    })

    test("should return false when NEXT_PUBLIC_CHATBOT_ENABLED has any other value", () => {
      process.env.NEXT_PUBLIC_CHATBOT_ENABLED = "1"
      expect(isChatbotEnabled()).toBe(false)
    })
  })
})
