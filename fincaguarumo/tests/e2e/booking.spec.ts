import { test, expect, type Page } from "@playwright/test"

/**
 * Picks the first enabled day in the open react-day-picker (v9).
 * Radix Popover portals content to `document.body`, so the calendar is not
 * under the modal `[role="dialog"]` node — scope via the popper wrapper + grid.
 */
async function selectFirstAvailableCalendarDay(page: Page) {
  // Wait for react-day-picker (not the loading placeholder inside the popover).
  await expect(
    page.locator("[data-radix-popper-content-wrapper] .rdp-month_grid"),
  ).toBeVisible({ timeout: 20_000 })
  const calendarPopover = page
    .locator("[data-radix-popper-content-wrapper]")
    .filter({ has: page.locator(".rdp-month_grid") })
    .last()
  // Day cells use `table[role="grid"]`; nav arrows are outside the grid. Custom
  // `classNames.day_button` previously dropped `rdp-day_button`, so avoid that class.
  await calendarPopover
    .locator('[role="grid"] button:not([disabled]):not([aria-disabled="true"])')
    .first()
    .click()
}

test.describe("Accommodation Booking Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/villa-bruno")
  })

  test("should load villa bruno page correctly", async ({ page }) => {
    await expect(page).toHaveTitle(/Villa Bruno/)
    await expect(page.locator("h1")).toContainText("Villa Bruno")
  })

  test("should open booking dialog and complete accommodation booking flow", async ({
    page,
  }) => {
    await page.click('[data-testid="booking-button-villa"]')

    await expect(page.locator('[role="dialog"]')).toBeVisible()

    await expect(
      page.locator('[data-testid="booking-form"][data-active-step="dates"]'),
    ).toBeVisible()

    await page.click('[data-testid="select-check-in"]')
    await selectFirstAvailableCalendarDay(page)
    // Check-out is set automatically to the day after check-in

    await page.click('[data-testid="select-guests"] button')
    await page.click('[data-testid="select-2-guests"]')

    await page.click('[data-testid="submit"]')

    await expect(
      page.locator('[data-testid="booking-form"][data-active-step="personal"]'),
    ).toBeVisible()

    await page.fill('[data-testid="name"]', "John Doe")
    await page.fill('[data-testid="email"]', "john.doe@example.com")
    await page.fill('[data-testid="phone"]', "+1234567890")

    await page.click('[data-testid="submit"]')

    await expect(
      page.locator('[data-testid="booking-form"][data-active-step="payment"]'),
    ).toBeVisible()
    await expect(
      page.locator('[data-testid="villa-price-calculation"]'),
    ).toBeVisible()

    await page.click('[data-testid="submit"]')

    await expect(page.locator('[data-testid="booking-payment"]')).toBeVisible()
  })

  test("should validate required fields in personal details step", async ({
    page,
  }) => {
    await page.click('[data-testid="booking-button-villa"]')

    await page.click('[data-testid="select-check-in"]')
    await selectFirstAvailableCalendarDay(page)

    await page.click('[data-testid="select-guests"] button')
    await page.click('[data-testid="select-2-guests"]')
    await page.click('[data-testid="submit"]')

    await page.click('[data-testid="submit"]')

    await expect(page.locator('[data-testid="phone-error"]')).toBeVisible()
  })

  test("should allow navigation between booking steps", async ({ page }) => {
    await page.click('[data-testid="booking-button-villa"]')

    await page.click('[data-testid="select-check-in"]')
    await selectFirstAvailableCalendarDay(page)

    await page.click('[data-testid="select-guests"] button')
    await page.click('[data-testid="select-2-guests"]')
    await page.click('[data-testid="submit"]')

    await page.click('[data-testid="booking-back"]')

    await expect(
      page.locator('[data-testid="booking-form"][data-active-step="dates"]'),
    ).toBeVisible()
    await expect(page.locator('[data-testid="booking-calendar"]')).toBeVisible()
  })

  test("should cancel booking correctly", async ({ page }) => {
    await page.click('[data-testid="booking-button-villa"]')

    await expect(page.locator('[role="dialog"]')).toBeVisible()

    await page.click('[data-testid="booking-cancel"]')

    await expect(page.locator('[role="dialog"]')).toBeHidden()
  })
})

test.describe("Tour Booking Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tours")
  })

  test("should load tours page correctly", async ({ page }) => {
    await expect(page).toHaveTitle(/Tours/)
    await expect(page.locator("h1")).toContainText("Tours")
  })

  test("should open tour booking dialog and complete tour booking flow", async ({
    page,
  }) => {
    await page.click('[data-testid="tour-item"]')

    await expect(page.locator("h1")).toBeVisible()

    await page.click('[data-testid="booking-button-tour"]')

    await expect(page.locator('[role="dialog"]')).toBeVisible()

    await expect(
      page.locator('[data-testid="booking-form"][data-active-step="dates"]'),
    ).toBeVisible()
    await expect(page.locator('[data-testid="date-picker"]')).toBeVisible()

    await page.click('[data-testid="select-date"]')
    await selectFirstAvailableCalendarDay(page)

    await page.click('[data-testid="select-guests"] button')
    await page.click('[data-testid="select-2-guests"]')

    await page.click('[data-testid="submit"]')

    await expect(
      page.locator('[data-testid="booking-form"][data-active-step="personal"]'),
    ).toBeVisible()

    await page.fill('[data-testid="name"]', "Jane Smith")
    await page.fill('[data-testid="email"]', "jane.smith@example.com")
    await page.fill('[data-testid="phone"]', "+9876543210")

    await page.click('[data-testid="submit"]')

    await expect(
      page.locator('[data-testid="booking-form"][data-active-step="payment"]'),
    ).toBeVisible()

    await expect(
      page.locator('[data-testid="tour-price-calculation"]'),
    ).toBeVisible()

    await page.click('[data-testid="submit"]')

    await expect(page.locator('[data-testid="booking-payment"]')).toBeVisible()
  })
})

test.describe("API Endpoints", () => {
  test("should check availability correctly", async ({ request }) => {
    const response = await request.post("/api/availability", {
      data: {
        checkIn: "2026-12-15",
        checkOut: "2026-12-18",
      },
    })

    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty("isAvailable")
    expect(typeof data.isAvailable).toBe("boolean")
  })

  test("should get bookings data", async ({ request }) => {
    const response = await request.get("/api/bookings")

    expect([401, 403]).toContain(response.status())

    if (response.status() === 401) {
      const data = await response.json()
      expect(data).toHaveProperty("error")
      expect(data.error).toContain("authorization")
    }
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
          checkIn: "2026-12-15T00:00:00.000Z",
          checkOut: "2026-12-18T00:00:00.000Z",
          guests: 2,
          basePrice: 115,
          totalPrice: 345,
          currency: "usd",
        },
      },
    })

    expect([200, 400, 500]).toContain(response.status())
  })
})
