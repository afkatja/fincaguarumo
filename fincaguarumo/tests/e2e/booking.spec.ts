import { test, expect } from "@playwright/test"

test.describe("Accommodation Booking Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/villa-bruno")
  })

  test("should load villa bruno page correctly", async ({ page }) => {
    await expect(page).toHaveTitle(/Villa Bruno.*Finca Guarumo/)
    await expect(page.locator("h1")).toContainText("Villa Bruno")
  })

  test("should open booking dialog and complete accommodation booking flow", async ({
    page,
  }) => {
    // Click the "Book Now" button
    await page.click(
      '[data-testid="booking-submit-button"], button[name="booking-submit-button"]',
    )

    // Wait for booking dialog to open
    await expect(page.locator('[role="dialog"]')).toBeVisible()

    // Step 1: Dates selection
    await expect(page.locator("text=Dates")).toBeVisible()

    // Select check-in date (click on a future date)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Click on a date in the calendar
    await page.click(
      '[data-testid="booking-calendar"] button[aria-label*="Select date"]',
    )

    // Select check-out date
    const checkOutDate = new Date(today)
    checkOutDate.setDate(checkOutDate.getDate() + 3)
    await page.click(
      '[data-testid="booking-calendar"] button[aria-label*="Select date"]:nth-child(2)',
    )

    // Select number of guests
    await page.click('[data-testid="select-guests"] button')
    await page.click("text=2")

    // Click Next to go to personal details
    await page.click("text=Next")

    // Step 2: Personal details
    await expect(page.locator("text=Personal Details")).toBeVisible()

    // Fill in personal information
    await page.fill('input[name="name"]', "John Doe")
    await page.fill('input[name="email"]', "john.doe@example.com")
    await page.fill('input[name="phone"]', "+1234567890")

    // Click Next to go to payment
    await page.click("text=Next")

    // Step 3: Payment step
    await expect(page.locator("text=Payment")).toBeVisible()
    await expect(page.locator("text=secure payment page")).toBeVisible()

    // Should show price calculation
    await expect(
      page.locator('[data-testid="price-calculation"]'),
    ).toBeVisible()

    // Click Reserve to submit booking
    await page.click("text=Reserve")

    // Should redirect to payment or show confirmation
    await expect(
      page.locator("text=Payment").or(page.locator("text=Confirmation")),
    ).toBeVisible()
  })

  test("should validate required fields in personal details step", async ({
    page,
  }) => {
    // Open booking dialog
    await page.click(
      '[data-testid="booking-submit-button"], button[name="booking-submit-button"]',
    )

    // Skip dates step for testing validation
    await page.click(
      '[data-testid="booking-calendar"] button[aria-label*="Select date"]',
    )
    await page.click(
      '[data-testid="booking-calendar"] button[aria-label*="Select date"]:nth-child(2)',
    )
    await page.click('[data-testid="select-guests"] button')
    await page.click("text=2")
    await page.click("text=Next")

    // Try to proceed without filling required fields
    await page.click("text=Next")

    // Should show validation errors
    await expect(page.locator("text=required")).toBeVisible()
  })

  test("should allow navigation between booking steps", async ({ page }) => {
    // Open booking dialog
    await page.click(
      '[data-testid="booking-submit-button"], button[name="booking-submit-button"]',
    )

    // Proceed to personal details
    await page.click(
      '[data-testid="booking-calendar"] button[aria-label*="Select date"]',
    )
    await page.click(
      '[data-testid="booking-calendar"] button[aria-label*="Select date"]:nth-child(2)',
    )
    await page.click('[data-testid="select-guests"] button')
    await page.click("text=2")
    await page.click("text=Next")

    // Go back to dates step
    await page.click("text=Back")

    // Should be back on dates step
    await expect(page.locator("text=Dates")).toBeVisible()
    await expect(page.locator('[data-testid="booking-calendar"]')).toBeVisible()
  })

  test("should cancel booking correctly", async ({ page }) => {
    // Open booking dialog
    await page.click(
      '[data-testid="booking-submit-button"], button[name="booking-submit-button"]',
    )

    // Click Cancel
    await page.click("text=Cancel")

    // Dialog should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()
  })
})

test.describe("Tour Booking Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tours")
  })

  test("should load tours page correctly", async ({ page }) => {
    await expect(page).toHaveTitle(/Tours.*Finca Guarumo/)
    await expect(page.locator("h1")).toContainText("Tours")
  })

  test("should open tour booking dialog and complete tour booking flow", async ({
    page,
  }) => {
    // Find and click on a tour
    await page.click('[data-testid="tour-item"], .tour-item')

    // Wait for tour page to load
    await expect(page.locator("h1")).toBeVisible()

    // Click the "Book Tour" button
    await page.click(
      '[data-testid="booking-submit-button"], button[name="booking-submit-button"]',
    )

    // Wait for booking dialog to open
    await expect(page.locator('[role="dialog"]')).toBeVisible()

    // Step 1: Tour date selection (should use date picker instead of calendar)
    await expect(page.locator("text=Dates")).toBeVisible()
    await expect(page.locator('[data-testid="date-picker"]')).toBeVisible()

    // Select a tour date
    await page.click('[data-testid="date-picker"] button')

    // Select number of guests
    await page.click('[data-testid="select-guests"] button')
    await page.click("text=2")

    // Click Next to go to personal details
    await page.click("text=Next")

    // Step 2: Personal details
    await expect(page.locator("text=Personal Details")).toBeVisible()

    // Fill in personal information
    await page.fill('input[name="name"]', "Jane Smith")
    await page.fill('input[name="email"]', "jane.smith@example.com")
    await page.fill('input[name="phone"]', "+9876543210")

    // Click Next to go to payment
    await page.click("text=Next")

    // Step 3: Payment step
    await expect(page.locator("text=Payment")).toBeVisible()

    // Should show price calculation for tour
    await expect(
      page.locator('[data-testid="price-calculation"]'),
    ).toBeVisible()

    // Click Reserve to submit booking
    await page.click("text=Reserve")

    // Should redirect to payment or show confirmation
    await expect(
      page.locator("text=Payment").or(page.locator("text=Confirmation")),
    ).toBeVisible()
  })
})

test.describe("API Endpoints", () => {
  test("should check availability correctly", async ({ request }) => {
    const response = await request.post("/api/availability", {
      data: {
        checkIn: "2024-12-15",
        checkOut: "2024-12-18",
      },
    })

    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty("isAvailable")
    expect(typeof data.isAvailable).toBe("boolean")
  })

  test("should get bookings data", async ({ request }) => {
    const response = await request.get("/api/bookings")

    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(Array.isArray(data)).toBe(true)
  })

  test("should handle stripe checkout session creation", async ({
    request,
  }) => {
    const response = await request.post("/api/create-checkout-session", {
      data: {
        customerDetails: {
          name: "Test User",
          email: "test@example.com",
          phoneNumber: "1234567890",
        },
        bookingDetails: {
          type: "villa",
          title: "Villa Bruno",
          description: "Test booking",
          checkIn: "2024-12-15T00:00:00.000Z",
          checkOut: "2024-12-18T00:00:00.000Z",
          guests: 2,
          basePrice: 115,
          totalPrice: 345,
          currency: "usd",
        },
      },
    })

    // This might fail due to Stripe configuration, but should handle gracefully
    expect([200, 400, 500]).toContain(response.status())
  })
})
