/**
 * Sanitizes text content to prevent HTML injection
 * @param text - The text to sanitize
 * @returns Sanitized text with HTML tags removed and special characters escaped
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== "string") {
    return ""
  }

  // First, remove HTML tags using regex (simple but effective for this use case)
  let cleanText = text.replace(/<[^>]*>/g, "")

  // Then, HTML-escape any remaining special characters
  return cleanText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
}

/**
 * Validates email format
 * @param email - The email to validate
 * @returns True if email is valid format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validates and sanitizes contact form input
 * @param data - Contact form data
 * @returns Validated and sanitized data with error messages
 */
export function validateContactForm(data: {
  name: string
  email: string
  message: string
}): { isValid: boolean; sanitizedData?: any; errors?: string[] } {
  const errors: string[] = []

  // Validate name
  if (!data.name || typeof data.name !== "string") {
    errors.push("Name is required")
  } else if (data.name.trim().length < 2) {
    errors.push("Name must be at least 2 characters long")
  } else if (data.name.trim().length > 100) {
    errors.push("Name must be less than 100 characters long")
  }

  // Validate email
  if (!data.email || typeof data.email !== "string") {
    errors.push("Email is required")
  } else if (!isValidEmail(data.email.trim())) {
    errors.push("Please provide a valid email address")
  }

  // Validate message
  if (!data.message || typeof data.message !== "string") {
    errors.push("Message is required")
  } else if (data.message.trim().length < 10) {
    errors.push("Message must be at least 10 characters long")
  } else if (data.message.trim().length > 2000) {
    errors.push("Message must be less than 2000 characters long")
  }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  // Sanitize all inputs
  const sanitizedData = {
    name: sanitizeText(data.name.trim()),
    email: sanitizeText(data.email.trim()),
    message: sanitizeText(data.message.trim()),
  }

  return { isValid: true, sanitizedData }
}
