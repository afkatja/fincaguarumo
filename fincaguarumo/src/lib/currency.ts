/**
 * Centralized currency formatting utility
 * Provides consistent currency formatting across the application
 */

export interface CurrencyFormatOptions {
  locale?: string
  currency?: string
  minimumFractionDigits?: number
}

/**
 * Formats a number as currency with consistent formatting
 * @param amount - The amount to format
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  options: CurrencyFormatOptions = {}
): string {
  const {
    locale = "en-US",
    currency = "USD",
    minimumFractionDigits = 0,
  } = options

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits,
  })
    .format(amount)
    .trim()
}

/**
 * Creates a reusable currency formatter function
 * @param options - Default formatting options
 * @returns A function that formats numbers with the given options
 */
export function createCurrencyFormatter(
  options: CurrencyFormatOptions = {}
) {
  return (amount: number) => formatCurrency(amount, options)
}
