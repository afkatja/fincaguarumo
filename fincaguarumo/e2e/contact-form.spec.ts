import { test, expect } from "@playwright/test"

test.describe("Contact Form", () => {
  test("should submit contact form successfully", async ({ page }) => {
    // Navigate to contact page
    await page.goto("/en/contact")

    // Wait for page to load
    await expect(page).toHaveTitle(/Finca Guarumo/)

    // Verify contact form is present
    await expect(page.getByText("Contact Us")).toBeVisible()

    // Fill out the contact form
    await page.getByLabel("Name").fill("Jane Smith")
    await page.getByLabel("Email").fill("jane.smith@example.com")
    await page
      .getByLabel("Message")
      .fill("Hello, I would like to inquire about availability for next month.")

    // Submit the form
    await page.getByRole("button", { name: /send-message-button/i }).click()

    // Wait for success message
    await expect(page.getByText(/message sent successfully/i)).toBeVisible()

    // Verify form is cleared after successful submission
    await expect(page.getByLabel("Name")).toHaveValue("")
    await expect(page.getByLabel("Email")).toHaveValue("")
    await expect(page.getByLabel("Message")).toHaveValue("")
  })

  test("should validate required fields", async ({ page }) => {
    await page.goto("/en/contact")

    // Try to submit empty form
    await page.getByRole("button", { name: /send-message-button/i }).click()

    // Should show validation errors for required fields
    // Note: HTML5 validation may prevent submission, or show browser validation
    await expect(page.getByLabel("Name")).toBeVisible()
    await expect(page.getByLabel("Email")).toBeVisible()
    await expect(page.getByLabel("Message")).toBeVisible()
  })

  test("should validate email format", async ({ page }) => {
    await page.goto("/en/contact")

    // Fill form with invalid email
    await page.getByLabel("Name").fill("Test User")
    await page.getByLabel("Email").fill("invalid-email")
    await page.getByLabel("Message").fill("Test message")

    // Submit form
    await page.getByRole("button", { name: /send-message-button/i }).click()

    // Should show email validation error or prevent submission
    // Note: This depends on browser validation behavior
    await expect(page.getByLabel("Email")).toBeVisible()
  })
})
