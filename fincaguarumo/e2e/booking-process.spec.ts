import { test, expect } from "@playwright/test"

test.describe("Booking Process", () => {
  test("should complete full booking flow for villa", async ({ page }) => {
    // Navigate to the homepage
    await page.goto("/en")

    // Wait for page to load
    await expect(page).toHaveTitle(/Finca Guarumo/)

    // Click on the booking button in header
    await page.getByRole("button", { name: "booking-button" }).click()

    // Should navigate to villa page
    await expect(page).toHaveURL(/.*\/stay/)

    // Click the booking dialog trigger
    await page.getByRole("button", { name: "booking-button" }).click()

    // Wait for booking dialog to open
    await expect(page.getByText("Reserve Villa Bruno directly")).toBeVisible()

    // Fill out booking form
    await page.getByLabel("Your name").fill("John Doe")
    await page.getByLabel("Your email").fill("john.doe@example.com")
    await page.getByLabel("Your phone number").fill("+1234567890")

    // Select dates (check-in and check-out)
    await page.getByLabel(/check.*in.*date/i).click()
    await page.getByRole("button", { name: "Next month" }).click()
    await page.getByRole("button", { name: "15" }).click() // Select 15th

    await page.getByLabel(/check.*out.*date/i).click()
    await page.getByRole("button", { name: "17" }).click() // Select 17th

    // Select number of guests
    await page.getByLabel(/number.*guests/i).selectOption("2")

    // Submit booking form
    await page.getByRole("button", { name: "booking-submit-button" }).click()

    // Should navigate to payment page
    await expect(page).toHaveURL(/.*\/payment/)

    // Verify booking summary is displayed
    await expect(page.getByText("John Doe")).toBeVisible()
    await expect(page.getByText(/2.*people/)).toBeVisible()

    // Note: Payment testing would require Stripe test environment
    // For now, we verify the payment page loads correctly
    await expect(page.getByText(/payment.*method/i)).toBeVisible()
  })

  test("should handle booking validation errors", async ({ page }) => {
    await page.goto("/en/villa-bruno")

    // Click booking button without filling form
    await page.getByRole("button", { name: "booking-button" }).click()

    // Try to submit empty form
    await page.getByRole("button", { name: /booking-submit-button/i }).click()

    // Should show validation errors
    await expect(page.getByText(/please enter your name/i)).toBeVisible()
    await expect(page.getByText(/please enter.*email/i)).toBeVisible()
  })

  test("should navigate through booking calendar", async ({ page }) => {
    await page.goto("/en/villa-bruno")

    await page.getByRole("button", { name: "booking-button" }).click()

    // Test calendar navigation
    await page.getByLabel(/check.*in.*date/i).click()
    await page.getByRole("button", { name: /.*previous month/i }).click()
    await page.getByRole("button", { name: /.*next month/i }).click()

    // Select valid date range
    await page.getByRole("button", { name: "20" }).click() // Check-in
    await page.getByLabel(/check.*out.*date/i).click()
    await page.getByRole("button", { name: "22" }).click() // Check-out

    // Verify dates are selected (check that form can proceed)
    await expect(
      page.getByRole("button", { name: "booking-submit-button" })
    ).toBeEnabled()
  })
})
