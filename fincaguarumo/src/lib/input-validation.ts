/**
 * Input Validation Utility
 *
 * Provides strict input validation with length limits and content sanitization
 * for all text inputs to prevent security vulnerabilities.
 */

// Maximum length limits for different input types
export const INPUT_LIMITS = {
  // Chat messages
  CHAT_MESSAGE: 10000,
  CHAT_THREAD_ID: 100,

  // Embeddings
  EMBEDDING_TEXT: 10000,
  EMBEDDING_BATCH_TEXT: 5000,
  EMBEDDING_CONTENT_ID: 255,
  EMBEDDING_CONTENT_TYPE: 50,
  EMBEDDING_LANGUAGE: 10,
  EMBEDDING_CONTENT: 10000,

  // Contact form
  CONTACT_NAME: 100,
  CONTACT_EMAIL: 255,
  CONTACT_MESSAGE: 2000,

  // Bookings
  BOOKING_GUEST_NAME: 100,
  BOOKING_EMAIL: 255,
  BOOKING_PHONE: 50,
  BOOKING_SOURCE: 50,
  BOOKING_TYPE: 50,
  BOOKING_SUMMARY: 500,
  BOOKING_DESCRIPTION: 1000,
  BOOKING_UID: 255,

  // General
  GENERAL_TEXT: 1000,
  GENERAL_SHORT_TEXT: 255,
  GENERAL_ID: 100,
} as const

// Character patterns to detect malicious content
const MALICIOUS_PATTERNS = [
  // Script tags and event handlers
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /<object[^>]*>.*?<\/object>/gi,
  /<embed[^>]*>.*?<\/embed>/gi,
  /<link[^>]*>/gi,
  /<meta[^>]*>/gi,
  /on\w+\s*=/gi, // Event handlers like onclick, onload

  // JavaScript protocols
  /javascript:[^s]*/gi,
  /data:text\/html/gi,
  /vbscript:/gi,

  // SQL injection patterns
  /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b/gi,
  /\b(OR|AND)\s*\d+\s*=\s*\d+/gi,
  /\b(OR|AND)\s*['"]?\w+['"]?\s*=\s*['"]?\w+['"]?/gi,
  /\b(TABLE|FROM|WHERE|DATABASE)\b/gi,

  // Path traversal
  /\.\.\//g,
  /\.\.\\/g,

  // HTML tags (basic sanitization)
  /<[^>]*>/g,

  // Null bytes and control characters
  /\x00/g,
  /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,
]

// Allowed characters for different input types
const ALLOWED_PATTERNS = {
  // Email addresses (basic validation)
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  // Phone numbers (international format)
  PHONE: /^\+?[\d\s\-\(\)]+$/,

  // Alphanumeric with spaces and basic punctuation
  TEXT: /^[\w\s\-\.,!?@#%&*()'"\/\\:;]+$/,
}

export interface ValidationResult {
  isValid: boolean
  error?: string
  sanitizedValue?: string
}

export interface ApiValidationResult {
  isValid: boolean
  error?: string
  sanitizedValue?: Record<string, string>
}

/**
 * Sanitizes input by removing malicious content and normalizing whitespace
 */
function sanitizeInput(input: string): string {
  let sanitized = input

  // Remove malicious patterns
  MALICIOUS_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, "")
  })

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, " ").trim()

  // Remove null bytes and control characters
  sanitized = sanitized.replace(/\x00/g, "")
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")

  return sanitized
}

/**
 * Validates input length against specified limit
 */
function validateLength(input: string, maxLength: number): ValidationResult {
  if (input.length > maxLength) {
    return {
      isValid: false,
      error: `Input exceeds maximum length of ${maxLength} characters`,
    }
  }

  return { isValid: true }
}

/**
 * Validates input format against allowed pattern
 */
function validateFormat(input: string, pattern: RegExp): ValidationResult {
  if (!pattern.test(input)) {
    return {
      isValid: false,
      error: "Input format is invalid",
    }
  }

  return { isValid: true }
}

/**
 * Main validation function with sanitization and length limits
 */
export function validateInput(
  input: unknown,
  maxLength: number,
  options: {
    required?: boolean
    format?: keyof typeof ALLOWED_PATTERNS
    sanitize?: boolean
    fieldName?: string
  } = {},
): ValidationResult {
  const {
    required = true,
    format,
    sanitize = true,
    fieldName = "Input",
  } = options

  // Check if input exists
  if (input === null || input === undefined) {
    if (required) {
      return {
        isValid: false,
        error: `${fieldName} is required`,
      }
    }
    return { isValid: true }
  }

  // Convert to string if not already
  let stringValue = typeof input === "string" ? input : String(input)

  // Check if empty after trimming
  const trimmedValue = stringValue.trim()
  if (trimmedValue.length === 0) {
    if (required) {
      return {
        isValid: false,
        error: `${fieldName} cannot be empty`,
      }
    }
    return { isValid: true }
  }

  // Validate length
  const lengthValidation = validateLength(trimmedValue, maxLength)
  if (!lengthValidation.isValid) {
    return {
      ...lengthValidation,
      error: `${fieldName}: ${lengthValidation.error}`,
    }
  }

  // Sanitize input
  let sanitizedValue = trimmedValue
  if (sanitize) {
    sanitizedValue = sanitizeInput(trimmedValue)

    // Check if sanitization removed too much content
    if (sanitizedValue.length === 0 && trimmedValue.length > 0) {
      return {
        isValid: false,
        error: `${fieldName} contains invalid characters or content`,
      }
    }
  }

  // Validate format if specified
  if (format) {
    const formatValidation = validateFormat(
      sanitizedValue,
      ALLOWED_PATTERNS[format],
    )
    if (!formatValidation.isValid) {
      return {
        ...formatValidation,
        error: `${fieldName}: ${formatValidation.error}`,
      }
    }
  }

  return {
    isValid: true,
    sanitizedValue,
  }
}

/**
 * Validates chat message input
 */
export function validateChatMessage(message: unknown): ValidationResult {
  return validateInput(message, INPUT_LIMITS.CHAT_MESSAGE, {
    fieldName: "Chat message",
    sanitize: true,
  })
}

/**
 * Validates embedding text input
 */
export function validateEmbeddingText(text: unknown): ValidationResult {
  return validateInput(text, INPUT_LIMITS.EMBEDDING_TEXT, {
    fieldName: "Embedding text",
    sanitize: true,
  })
}

/**
 * Validates embedding batch text input
 */
export function validateEmbeddingBatchText(texts: unknown[]): ValidationResult {
  if (!Array.isArray(texts)) {
    return {
      isValid: false,
      error: "Texts must be an array",
    }
  }

  if (texts.length === 0) {
    return {
      isValid: false,
      error: "Texts array cannot be empty",
    }
  }

  if (texts.length > 100) {
    return {
      isValid: false,
      error: "Batch size cannot exceed 100 items",
    }
  }

  for (let i = 0; i < texts.length; i++) {
    const validation = validateInput(
      texts[i],
      INPUT_LIMITS.EMBEDDING_BATCH_TEXT,
      {
        fieldName: `Batch text ${i + 1}`,
        sanitize: true,
      },
    )

    if (!validation.isValid) {
      return validation
    }
  }

  return { isValid: true }
}

/**
 * Validates contact form input
 */
export function validateContactForm(data: {
  name?: unknown
  email?: unknown
  message?: unknown
}): ApiValidationResult {
  const errors: string[] = []
  const sanitizedData: Record<string, string> = {}

  // Validate name
  const nameValidation = validateInput(data.name, INPUT_LIMITS.CONTACT_NAME, {
    fieldName: "Name",
    sanitize: true,
  })
  if (!nameValidation.isValid) {
    errors.push(nameValidation.error!)
  } else if (nameValidation.sanitizedValue) {
    sanitizedData.name = nameValidation.sanitizedValue
  }

  // Validate email
  const emailValidation = validateInput(
    data.email,
    INPUT_LIMITS.CONTACT_EMAIL,
    {
      fieldName: "Email",
      format: "EMAIL",
      sanitize: true,
    },
  )
  if (!emailValidation.isValid) {
    errors.push(emailValidation.error!)
  } else if (emailValidation.sanitizedValue) {
    sanitizedData.email = emailValidation.sanitizedValue
  }

  // Validate message
  const messageValidation = validateInput(
    data.message,
    INPUT_LIMITS.CONTACT_MESSAGE,
    {
      fieldName: "Message",
      sanitize: true,
    },
  )
  if (!messageValidation.isValid) {
    errors.push(messageValidation.error!)
  } else if (messageValidation.sanitizedValue) {
    sanitizedData.message = messageValidation.sanitizedValue
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      error: errors.join("; "),
    }
  }

  return {
    isValid: true,
    sanitizedValue: sanitizedData,
  }
}

/**
 * Validates booking form input
 */
export function validateBookingForm(data: {
  guestName?: unknown
  email?: unknown
  phone?: unknown
  source?: unknown
  bookingType?: unknown
  summary?: unknown
  description?: unknown
  uid?: unknown
}): ApiValidationResult {
  const errors: string[] = []
  const sanitizedData: Record<string, string> = {}

  // Validate guest name
  const nameValidation = validateInput(
    data.guestName,
    INPUT_LIMITS.BOOKING_GUEST_NAME,
    {
      fieldName: "Guest name",
      sanitize: true,
    },
  )
  if (!nameValidation.isValid) {
    errors.push(nameValidation.error!)
  } else if (nameValidation.sanitizedValue) {
    sanitizedData.guestName = nameValidation.sanitizedValue
  }

  // Validate email (optional)
  if (data.email !== undefined && data.email !== null && data.email !== "") {
    const emailValidation = validateInput(
      data.email,
      INPUT_LIMITS.BOOKING_EMAIL,
      {
        fieldName: "Email",
        format: "EMAIL",
        sanitize: true,
        required: false,
      },
    )
    if (!emailValidation.isValid) {
      errors.push(emailValidation.error!)
    } else if (emailValidation.sanitizedValue) {
      sanitizedData.email = emailValidation.sanitizedValue
    }
  }

  // Validate phone (optional)
  if (data.phone !== undefined && data.phone !== null && data.phone !== "") {
    const phoneValidation = validateInput(
      data.phone,
      INPUT_LIMITS.BOOKING_PHONE,
      {
        fieldName: "Phone",
        format: "PHONE",
        sanitize: true,
        required: false,
      },
    )
    if (!phoneValidation.isValid) {
      errors.push(phoneValidation.error!)
    } else if (phoneValidation.sanitizedValue) {
      sanitizedData.phone = phoneValidation.sanitizedValue
    }
  }

  // Validate source
  const sourceValidation = validateInput(
    data.source,
    INPUT_LIMITS.BOOKING_SOURCE,
    {
      fieldName: "Source",
      sanitize: true,
      required: false,
    },
  )
  if (!sourceValidation.isValid) {
    errors.push(sourceValidation.error!)
  } else if (sourceValidation.sanitizedValue) {
    sanitizedData.source = sourceValidation.sanitizedValue
  }

  // Validate booking type
  const typeValidation = validateInput(
    data.bookingType,
    INPUT_LIMITS.BOOKING_TYPE,
    {
      fieldName: "Booking type",
      sanitize: true,
      required: false,
    },
  )
  if (!typeValidation.isValid) {
    errors.push(typeValidation.error!)
  } else if (typeValidation.sanitizedValue) {
    sanitizedData.bookingType = typeValidation.sanitizedValue
  }

  // Validate summary (optional)
  if (data.summary !== undefined) {
    const summaryValidation = validateInput(
      data.summary,
      INPUT_LIMITS.BOOKING_SUMMARY,
      {
        fieldName: "Summary",
        sanitize: true,
        required: false,
      },
    )
    if (!summaryValidation.isValid) {
      errors.push(summaryValidation.error!)
    } else if (summaryValidation.sanitizedValue) {
      sanitizedData.summary = summaryValidation.sanitizedValue
    }
  }

  // Validate description (optional)
  if (data.description !== undefined) {
    const descriptionValidation = validateInput(
      data.description,
      INPUT_LIMITS.BOOKING_DESCRIPTION,
      {
        fieldName: "Description",
        sanitize: true,
        required: false,
      },
    )
    if (!descriptionValidation.isValid) {
      errors.push(descriptionValidation.error!)
    } else if (descriptionValidation.sanitizedValue) {
      sanitizedData.description = descriptionValidation.sanitizedValue
    }
  }

  // Validate UID
  const uidValidation = validateInput(data.uid, INPUT_LIMITS.BOOKING_UID, {
    fieldName: "User ID",
    sanitize: true,
  })
  if (!uidValidation.isValid) {
    errors.push(uidValidation.error!)
  } else if (uidValidation.sanitizedValue) {
    sanitizedData.uid = uidValidation.sanitizedValue
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      error: errors.join("; "),
    }
  }

  return {
    isValid: true,
    sanitizedValue: sanitizedData,
  }
}

/**
 * Middleware function for API request validation
 */
export function validateApiRequest(
  requestBody: any,
  validationRules: Record<
    string,
    {
      maxLength: number
      required?: boolean
      format?: keyof typeof ALLOWED_PATTERNS
      sanitize?: boolean
    }
  >,
): ApiValidationResult {
  const errors: string[] = []
  const sanitizedData: Record<string, string> = {}

  for (const [field, rules] of Object.entries(validationRules)) {
    const value = requestBody[field]
    const validation = validateInput(value, rules.maxLength, {
      fieldName: field,
      required: rules.required,
      format: rules.format,
      sanitize: rules.sanitize,
    })

    if (!validation.isValid) {
      errors.push(validation.error!)
    } else if (validation.sanitizedValue !== undefined) {
      sanitizedData[field] = validation.sanitizedValue
    }
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      error: errors.join("; "),
    }
  }

  return {
    isValid: true,
    sanitizedValue: sanitizedData,
  }
}
