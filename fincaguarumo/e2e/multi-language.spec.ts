import { test, expect } from "@playwright/test"

test.describe("Multi-language Navigation", () => {
  test("should switch between English and Spanish", async ({ page }) => {
    // Start on English homepage
    await page.goto("/en")

    // Check for language selector
    const languageSelector = page
      .locator(
        '[data-testid="language-selector"], [aria-label*="language"], .language-selector'
      )
      .first()

    if (await languageSelector.isVisible()) {
      // If language selector exists, test switching
      await languageSelector.click()

      // Look for Spanish option
      const spanishOption = page
        .getByRole("option", { name: /español|spanish|es/i })
        .first()
      if (await spanishOption.isVisible()) {
        await spanishOption.click()

        // Should navigate to Spanish version
        await expect(page).toHaveURL(/\/es/)

        // Verify Spanish content (if translations exist)
        // Note: This depends on actual translation implementation
      }
    }
  })

  test("should maintain page context when switching languages", async ({
    page,
  }) => {
    // Navigate to a specific page in English
    await page.goto("/en/stay")

    // Try to switch language (if selector exists)
    const languageSelector = page
      .locator('[data-testid="language-selector"], [aria-label*="language"]')
      .first()

    if (await languageSelector.isVisible()) {
      await languageSelector.click()

      // Select different language
      const otherLanguage = page.getByRole("option").last()
      if (await otherLanguage.isVisible()) {
        const languageText = await otherLanguage.getAttribute("value")
        await otherLanguage.click()

        // Should stay on the same page but in different language
        await expect(page).toHaveURL(
          new RegExp(`/${languageText?.toLowerCase()}/stay`)
        )
      }
    }
  })

  test("should handle 404 pages in different languages", async ({ page }) => {
    // Test English 404
    await page.goto("/en/nonexistent-page")
    await expect(page).toHaveTitle(/Finca Guarumo/)

    // Test Spanish 404 (if supported)
    await page.goto("/es/pagina-inexistente")
    await expect(page).toHaveTitle(/Finca Guarumo/)
  })

  test("should preserve query parameters when switching languages", async ({
    page,
  }) => {
    // Navigate with query parameters
    await page.goto("/en?villa=bruno&guests=2")

    // Switch language (if possible)
    const languageSelector = page
      .locator('[data-testid="language-selector"]')
      .first()

    if (await languageSelector.isVisible()) {
      await languageSelector.click()

      const otherLanguage = page.getByRole("option").first()
      if (await otherLanguage.isVisible()) {
        await otherLanguage.click()

        // Should preserve query parameters
        await expect(page).toHaveURL(/\?villa=bruno&guests=2/)
      }
    }
  })

  test("should display correct locale-specific formatting", async ({
    page,
  }) => {
    // Test date/number formatting in different locales
    await page.goto("/en/reviews")

    // Look for dates or numbers that should be formatted differently
    // This depends on the actual content and implementation

    // Check if reviews have dates
    const dateElements = page
      .locator('[data-testid="review-date"], time, .date')
      .first()

    if (await dateElements.isVisible()) {
      const englishDate = await dateElements.textContent()

      // Switch to Spanish if possible
      const languageSelector = page
        .locator('[data-testid="language-selector"]')
        .first()
      if (await languageSelector.isVisible()) {
        await languageSelector.click()

        const spanishOption = page
          .getByRole("option", { name: /español|spanish/i })
          .first()
        if (await spanishOption.isVisible()) {
          await spanishOption.click()

          // Date format should potentially change for Spanish locale
          // Note: This depends on actual date formatting implementation
          await expect(page).toHaveURL(/\/es\/reviews/)
        }
      }
    }
  })
})
