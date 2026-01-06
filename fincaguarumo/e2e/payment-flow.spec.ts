import { test, expect } from "@playwright/test"

test.describe("Payment Flow", () => {
  test("should load payment page with booking details", async ({ page }) => {
    // First complete booking process to reach payment page
    await page.goto("/en/villa-bruno")

    // Open booking dialog
    await page.getByRole("button", { name: /Book.*Villa.*Bruno.*now/i }).click()

    // Fill booking form
    await page.getByLabel("Your name").fill("Payment Test User")
    await page.getByLabel("Your email").fill("payment.test@example.com")
    await page.getByLabel("Your phone number").fill("+1555123456")

    // Select dates (simplified - may need adjustment based on actual date picker)
    await page.getByLabel(/check.*in.*date/i).click()
    await page.getByRole("button", { name: "15" }).first().click()

    await page.getByLabel(/check.*out.*date/i).click()
    await page.getByRole("button", { name: "17" }).first().click()

    // Select guests
    await page.getByLabel(/number.*guests/i).selectOption("2")

    // Submit booking
    await page.getByRole("button", { name: /reserve/i }).click()

    // Should reach payment page
    await expect(page).toHaveURL(/.*\/payment/)

    // Verify booking details are carried over
    await expect(page.getByText("Payment Test User")).toBeVisible()
    await expect(page.getByText(/2.*people/)).toBeVisible()
  })

  test("should display Stripe payment form", async ({ page }) => {
    // Navigate directly to payment page (would need valid booking data in real scenario)
    await page.goto("/en/payment")

    // Verify Stripe elements are loaded (this may require actual booking data)
    // In a real test environment, you would set up test booking data

    // Check for Stripe badge
    await expect(page.getByAltText(/stripe/i)).toBeVisible()
  })

  test("should handle payment success redirect", async ({ page }) => {
    // This test would require mocking Stripe webhooks or using test mode
    // For now, test the success page directly

    await page.goto("/en/payment-success")

    // Verify success page loads
    await expect(page.getByText(/succeeded/i)).toBeVisible()

    // Check for calendar integration
    await expect(page.getByText(/add to calendar/i)).toBeVisible()
  })

  test("should handle payment errors gracefully", async ({ page }) => {
    // Test error handling - this would require setting up error conditions
    // For now, test that error page elements exist

    await page.goto("/en/payment-success?error=payment_failed")

    // Should show error message
    await expect(page.getByText(/not.*successful/i)).toBeVisible()
  })

  // test("should validate payment form data", async ({ page }) => {
  //   // Navigate to payment page
  //   await page.goto("/en/payment")

  //   // Note: Actual Stripe Elements validation testing requires
  //   // setting up test payment methods and would be complex

  //   // Verify basic page structure
  //   await expect(page.getByText(/payment/i)).toBeVisible()
  // })
})
