import { sanitizeText, isValidEmail, validateContactForm } from '../sanitize'

describe('sanitizeText', () => {
  test('should sanitize HTML tags', () => {
    const maliciousInput = '<script>alert("xss")</script>Hello'
    const result = sanitizeText(maliciousInput)
    expect(result).toBe('alert(&quot;xss&quot;)Hello')
  })

  test('should escape HTML entities', () => {
    const input = '<div>Test & "quotes" and \'apostrophes\'</div>'
    const result = sanitizeText(input)
    expect(result).toBe('Test &amp; &quot;quotes&quot; and &#x27;apostrophes&#x27;')
  })

  test('should handle empty input', () => {
    expect(sanitizeText('')).toBe('')
    expect(sanitizeText(null as any)).toBe('')
    expect(sanitizeText(undefined as any)).toBe('')
  })

  test('should preserve safe text', () => {
    const safeInput = 'Hello, this is safe text!'
    const result = sanitizeText(safeInput)
    expect(result).toBe('Hello, this is safe text!')
  })
})

describe('isValidEmail', () => {
  test('should validate correct email formats', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('user.name@domain.co.uk')).toBe(true)
    expect(isValidEmail('user+tag@example.org')).toBe(true)
  })

  test('should reject invalid email formats', () => {
    expect(isValidEmail('invalid-email')).toBe(false)
    expect(isValidEmail('@domain.com')).toBe(false)
    expect(isValidEmail('user@')).toBe(false)
    expect(isValidEmail('user@domain')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })
})

describe('validateContactForm', () => {
  test('should validate correct contact form data', () => {
    const validData = {
      name: 'John Doe',
      email: 'john@example.com',
      message: 'This is a valid message with sufficient length.'
    }

    const result = validateContactForm(validData)
    expect(result.isValid).toBe(true)
    expect(result.sanitizedData).toBeDefined()
    expect(result.sanitizedData.name).toBe('John Doe')
    expect(result.sanitizedData.email).toBe('john@example.com')
    expect(result.sanitizedData.message).toBe('This is a valid message with sufficient length.')
  })

  test('should reject data with malicious HTML injection', () => {
    const maliciousData = {
      name: '<script>alert("xss")</script>John',
      email: 'test@example.com',
      message: '<img src=x onerror=alert("xss")>Hello there!'
    }

    const result = validateContactForm(maliciousData)
    expect(result.isValid).toBe(true) // Should still be valid after sanitization
    expect(result.sanitizedData.name).toBe('alert(&quot;xss&quot;)John')
    expect(result.sanitizedData.message).toBe('Hello there!')
  })

  test('should reject invalid email', () => {
    const invalidData = {
      name: 'John Doe',
      email: 'invalid-email',
      message: 'This is a valid message with sufficient length.'
    }

    const result = validateContactForm(invalidData)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Please provide a valid email address')
  })

  test('should reject short name', () => {
    const invalidData = {
      name: 'J',
      email: 'test@example.com',
      message: 'This is a valid message with sufficient length.'
    }

    const result = validateContactForm(invalidData)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Name must be at least 2 characters long')
  })

  test('should reject short message', () => {
    const invalidData = {
      name: 'John Doe',
      email: 'test@example.com',
      message: 'Short'
    }

    const result = validateContactForm(invalidData)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Message must be at least 10 characters long')
  })

  test('should reject missing fields', () => {
    const invalidData = {
      name: '',
      email: '',
      message: ''
    }

    const result = validateContactForm(invalidData)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Name is required')
    expect(result.errors).toContain('Email is required')
    expect(result.errors).toContain('Message is required')
  })

  test('should reject overly long fields', () => {
    const longName = 'A'.repeat(101)
    const longMessage = 'B'.repeat(2001)

    const invalidData = {
      name: longName,
      email: 'test@example.com',
      message: longMessage
    }

    const result = validateContactForm(invalidData)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Name must be less than 100 characters long')
    expect(result.errors).toContain('Message must be less than 2000 characters long')
  })
})
