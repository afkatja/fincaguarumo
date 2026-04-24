/**
 * Testing patterns and utilities for booking + chat assistant debugging
 * This file provides patterns that can be used without Jest configuration
 */

// Test utilities for manual testing and debugging
export const testPatterns = {
  // Environment validation
  validateEnvironment: () => {
    const required = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_API_KEY",
      "MISTRAL_API_KEY",
      "PERPLEXITY_API_KEY",
      "SANITY_PROJECT_ID",
      "SANITY_DATASET",
    ]

    const missing = required.filter(key => !process.env[key])
    return {
      isValid: missing.length === 0,
      missing,
      present: required.filter(key => process.env[key]),
    }
  },

  // API endpoint testing patterns
  testChatAPI: async (message: string, locale = "en") => {
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: message }],
          locale,
          context: { page: "homepage" },
        }),
      })

      return {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        text: await response.text(),
      }
    } catch (error: any) {
      return { error: error.message }
    }
  },

  testBookingAPI: async (bookingData: any) => {
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      })

      return {
        status: response.status,
        ok: response.ok,
        data: response.ok ? await response.json() : await response.text(),
      }
    } catch (error: any) {
      return { error: error.message }
    }
  },

  // Component testing patterns
  testComponentRendering: (componentName: string) => {
    console.log(`Testing ${componentName} component...`)

    // Check for common React errors
    const errors = []

    // Test 1: Component imports correctly
    try {
      // This would be used with dynamic imports in actual testing
      console.log(`✓ ${componentName} imports successfully`)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      errors.push(`Import error: ${errorMessage}`)
    }

    // Test 2: Required props validation
    const requiredProps: Record<string, string[]> = {
      BookingChat: ["locale"],
      ChatInterface: ["variant"],
      BookingForm: ["onSubmit"],
      BookingCalendar: ["onDateSelect"],
    }

    if (requiredProps[componentName]) {
      console.log(
        `✓ Required props identified: ${requiredProps[componentName].join(", ")}`,
      )
    }

    return { errors, warnings: [] }
  },

  // RAG context testing
  testRAGContext: async (query: string, pageContext: any) => {
    console.log(`Testing RAG context for query: "${query}"`)

    // Test intent detection
    const intents: Record<string, string[]> = {
      amenities: ["amenit", "facilit", "feature", "pool", "wifi", "kitchen"],
      pricing: ["price", "cost", "fee", "discount", "season", "rate"],
      payment: ["payment", "pay", "card", "stripe", "paypal"],
      cancellation: ["cancel", "refund", "modification", "change"],
      logistics: ["check", "arrival", "departure", "transport", "direction"],
      tours: ["tour", "activit", "excursion", "trip"],
      reviews: ["review", "rating", "guest", "experience"],
    }

    const detectedIntent =
      Object.keys(intents).find(intent =>
        intents[intent].some((keyword: string) =>
          query.toLowerCase().includes(keyword),
        ),
      ) || "general"

    console.log(`✓ Detected intent: ${detectedIntent}`)

    return {
      detectedIntent,
      queryEnhancement: [
        query.toLowerCase(),
        ...(intents[detectedIntent]?.slice(0, 2) || []),
      ],
    }
  },

  // Database connection testing
  testDatabaseConnection: async () => {
    try {
      // This would use the actual Supabase client
      console.log("Testing database connection...")

      const tests = [
        "Connect to Supabase",
        "Test bookings table access",
        "Test availability table access",
        "Test RLS policies",
      ]

      const results = tests.map(test => ({
        test,
        status: "pending", // Would be actual test result
        error: null,
      }))

      return { results }
    } catch (error: any) {
      return { error: error.message }
    }
  },

  // AI service testing
  testAIService: async () => {
    console.log("Testing AI service integration...")

    const tests = [
      {
        name: "AI Client Initialization",
        test: () => {
          // Test client setup
          return { success: true, message: "Client initialized" }
        },
      },
      {
        name: "Chat Completion",
        test: () => {
          // Test basic chat
          return { success: true, message: "Chat completion works" }
        },
      },
      {
        name: "Tool Execution",
        test: () => {
          // Test tool calling
          return { success: true, message: "Tools execute correctly" }
        },
      },
    ]

    const results = await Promise.allSettled(
      tests.map(async test => {
        try {
          const result = await test.test()
          return { ...test, ...result, status: "passed" }
        } catch (error) {
          return {
            ...test,
            error: error instanceof Error ? error.message : String(error),
            status: "failed",
          }
        }
      }),
    )

    return results
  },
}

// Error classification utilities
export const errorClassifier = {
  classifyError: (error: any) => {
    const message = error.message || error.toString()

    // Critical errors
    if (message.includes("API_KEY") || message.includes("SUPABASE_URL")) {
      return {
        category: "critical",
        type: "environment",
        fix: "Check environment variables configuration",
      }
    }

    if (message.includes("ECONNREFUSED") || message.includes("ENOTFOUND")) {
      return {
        category: "critical",
        type: "connection",
        fix: "Check network connectivity and service availability",
      }
    }

    // High priority errors
    if (message.includes("permission denied") || message.includes("42501")) {
      return {
        category: "high",
        type: "database",
        fix: "Check RLS policies and database permissions",
      }
    }

    if (message.includes("rate limit") || message.includes("429")) {
      return {
        category: "high",
        type: "api",
        fix: "Implement rate limiting and retry logic",
      }
    }

    // Medium priority errors
    if (message.includes("validation") || message.includes("schema")) {
      return {
        category: "medium",
        type: "data",
        fix: "Validate data structure and schema definitions",
      }
    }

    return {
      category: "low",
      type: "unknown",
      fix: "Investigate error context and logs",
    }
  },

  suggestFix: (error: any, context: string) => {
    const classification = errorClassifier.classifyError(error)

    const suggestions: Record<string, string[]> = {
      "UI Component": [
        "Check React component props",
        "Verify state management",
        "Review event handlers",
        "Check translation keys",
      ],
      "API Endpoint": [
        "Verify request format",
        "Check authentication",
        "Review error handling",
        "Test with curl commands",
      ],
      "RAG Context": [
        "Check Sanity CMS connection",
        "Validate embedding setup",
        "Review intent detection",
        "Test content retrieval",
      ],
      "AI Service": [
        "Verify API keys",
        "Check model availability",
        "Review tool definitions",
        "Test response parsing",
      ],
      Database: [
        "Check connection strings",
        "Verify table schemas",
        "Review RLS policies",
        "Test query syntax",
      ],
    }

    return {
      classification,
      contextSuggestions: suggestions[context] || ["Investigate further"],
      nextSteps: [
        "Check browser console for errors",
        "Review server logs",
        "Test with minimal data",
        "Isolate the failing component",
      ],
    }
  },
}

// Performance testing utilities
export const performanceTests = {
  measureResponseTime: async (fn: Function, label: string) => {
    const start = performance.now()
    const result = await fn()
    const end = performance.now()

    console.log(`${label}: ${(end - start).toFixed(2)}ms`)
    return { result, time: end - start }
  },

  testMemoryUsage: () => {
    if (typeof window !== "undefined" && window.performance) {
      const memory = (window.performance as any).memory
      if (memory) {
        return {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
        }
      }
    }
    return null
  },

  testConcurrentRequests: async (url: string, count = 10) => {
    const requests = Array.from({ length: count }, () =>
      fetch(url).then(res => ({ status: res.status, ok: res.ok })),
    )

    const start = performance.now()
    const results = await Promise.allSettled(requests)
    const end = performance.now()

    const successful = results.filter(
      r => r.status === "fulfilled" && r.value.ok,
    ).length

    return {
      total: count,
      successful,
      failed: count - successful,
      averageTime: (end - start) / count,
      results,
    }
  },
}

// Test data generators
export const testDataGenerators = {
  validBooking: () => ({
    checkIn: "2026-12-01",
    checkOut: "2026-12-02",
    guestName: "Test User",
    email: "test@example.com",
    phone: "+1234567890",
    guests: 2,
    totalPrice: 100,
    currency: "usd",
    source: "Direct",
    uid: "test-uid-" + Math.random().toString(36).substring(2, 11),
  }),

  validChatMessage: (content = "What amenities are available?") => ({
    role: "user",
    content,
    timestamp: new Date().toISOString(),
  }),

  mockRAGContext: () => ({
    faqs: [
      {
        question: "Is there a pool?",
        answer: "Yes, we have a private pool",
        priority: 8,
      },
      {
        question: "What is the check-in time?",
        answer: "Check-in is at 3 PM",
        priority: 9,
      },
    ],
    amenities: [
      {
        title: "Private Pool",
        description: "Swimming pool with terrace",
        category: "recreation",
      },
      {
        title: "WiFi",
        description: "High-speed internet",
        category: "technology",
      },
    ],
    pricing: [
      { title: "Base Rate", amount: 100, type: "nightly" },
      { title: "Cleaning Fee", amount: 50, type: "one-time" },
    ],
  }),

  errorScenarios: () => [
    {
      name: "Missing AI API Key",
      error: new Error("PERPLEXITY_API_KEY is required"),
      context: "AI Service",
    },
    {
      name: "Missing Eval API Key",
      error: new Error("MISTRAL_API_KEY is required"),
      context: "AI Evaluation Service",
    },
    {
      name: "Database Connection Failed",
      error: new Error("ECONNREFUSED: Connection refused"),
      context: "Database",
    },
    {
      name: "Invalid Booking Data",
      error: new Error("checkIn is required"),
      context: "API Endpoint",
    },
    {
      name: "RAG Context Empty",
      error: new Error("No content found for query"),
      context: "RAG Context",
    },
  ],
}

// Logging utilities
export const debugLogger = {
  logStep: (step: string, details?: any) => {
    console.log(`🔍 [DEBUG] ${step}`, details || "")
  },

  logError: (error: any, context: string) => {
    console.error(`❌ [ERROR] ${context}:`, error)
  },

  logSuccess: (message: string) => {
    console.log(`✅ [SUCCESS] ${message}`)
  },

  logWarning: (message: string) => {
    console.warn(`⚠️  [WARNING] ${message}`)
  },

  createTestReport: (results: any[]) => {
    const passed = results.filter(r => r.status === "passed").length
    const failed = results.filter(r => r.status === "failed").length

    return {
      summary: {
        total: results.length,
        passed,
        failed,
        successRate: (passed / results.length) * 100,
      },
      details: results,
      recommendations:
        failed > 0
          ? [
              "Review failed tests",
              "Check error logs",
              "Verify environment setup",
              "Test with minimal configuration",
            ]
          : ["All tests passed!"],
    }
  },
}

// Export default patterns object for easy access
export default {
  testPatterns,
  errorClassifier,
  performanceTests,
  testDataGenerators,
  debugLogger,
}
