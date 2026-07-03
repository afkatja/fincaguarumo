# Input Validation Security Guidelines

## Overview

This document outlines the comprehensive input validation and sanitization system implemented to protect against security vulnerabilities including XSS, SQL injection, and other malicious attacks.

## Security Features

### 1. Strict Length Limits

All text inputs are validated against maximum character limits to prevent buffer overflow attacks and excessive resource consumption:

- **Chat Messages**: 10,000 characters
- **Embedding Text**: 10,000 characters  
- **Embedding Batch Text**: 5,000 characters per item
- **Contact Name**: 100 characters
- **Contact Email**: 255 characters
- **Contact Message**: 2,000 characters
- **Booking Guest Name**: 100 characters
- **Booking Email**: 255 characters
- **Booking Phone**: 50 characters

### 2. Content Sanitization

The system automatically removes or neutralizes malicious content patterns:

#### Script and Event Handler Removal
- `<script>` tags and content
- `<iframe>`, `<object>`, `<embed>` tags
- Event handlers (`onclick`, `onload`, etc.)
- HTML tag attributes

#### Protocol Filtering
- `javascript:` URLs
- `data:text/html` URLs  
- `vbscript:` URLs

#### SQL Injection Prevention
- SQL keywords: `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `DROP`, `CREATE`, `ALTER`, `EXEC`, `UNION`
- Boolean-based injection patterns
- Comment-based injection attempts

#### Path Traversal Protection
- `../` directory traversal
- `..\\` Windows traversal
- Encoded traversal attempts

#### Control Character Filtering
- Null bytes (`\x00`)
- Control characters (`\x00-\x08`, `\x0B`, `\x0C`, `\x0E-\x1F`, `\x7F`)

### 3. Format Validation

Specific input types are validated against allowed patterns:

- **Email**: Basic email format validation
- **Phone**: International phone number format
- **General Text**: Alphanumeric with basic punctuation

## Implementation Details

### API Endpoint Protection

All API endpoints now implement strict input validation:

#### `/api/chat`
- Validates message content and metadata
- Sanitizes all user input
- Enforces length limits
- Validates message roles and structure

#### `/api/embeddings`
- Validates text inputs for embedding generation
- Sanitizes batch processing data
- Validates admin-only operations
- Enforces batch size limits

#### `/api/contact`
- Validates contact form fields
- Sanitizes email content
- Validates email format
- Enforces field length limits

#### `/api/bookings`
- Validates booking data
- Sanitizes guest information
- Validates phone/email formats
- Enforces field length limits

### Client-Side Validation

Form components include real-time validation:

#### Chat Interface
- Character count display
- Real-time error messages
- Malicious content detection
- Input length enforcement

#### Contact Forms
- Field-level validation
- Format checking
- Error state management

## Security Headers

All API responses include security headers:

```http
Content-Security-Policy: default-src 'none'; script-src 'none'; style-src 'none'; img-src 'none'; font-src 'none'; connect-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

## Usage Guidelines

### For Developers

1. **Always use the validation utilities**:
   ```typescript
   import { validateInput, INPUT_LIMITS } from '@/lib/input-validation'
   
   const result = validateInput(userInput, INPUT_LIMITS.CHAT_MESSAGE, {
     sanitize: true,
     required: true
   })
   ```

2. **Check validation results**:
   ```typescript
   if (!result.isValid) {
     return { error: result.error }
   }
   const sanitizedInput = result.sanitizedValue!
   ```

3. **Use specific validators when available**:
   ```typescript
   import { validateContactForm, validateBookingForm } from '@/lib/input-validation'
   ```

### For Security Teams

1. **Monitor validation logs** for attempted attacks
2. **Review length limits** periodically based on usage patterns
3. **Update sanitization patterns** as new threats emerge
4. **Test validation** with security testing tools

## Testing

### Automated Tests

Comprehensive test suite covers:

- Valid input acceptance
- Length limit enforcement
- Malicious content sanitization
- Format validation
- Edge cases and error conditions

Run tests:
```bash
npm test -- --testPathPatterns=input-validation.test.ts
```

### Security Testing

Test against common attack vectors:

```javascript
// XSS attempts
'<script>alert("xss")</script>'
'javascript:alert("xss")'
'<img src="x" onerror="alert(1)">'

// SQL injection
"'; DROP TABLE users; --"
"' OR '1'='1"

// Path traversal
'../../../etc/passwd'
'..\\..\\..\\windows\\system32'

// Control characters
'test\x00file'
'content\x01\x02\x03'
```

## Best Practices

### Input Validation
1. **Never trust user input** - always validate and sanitize
2. **Use strict whitelist** approaches rather than blacklisting
3. **Validate on both client and server** - client for UX, server for security
4. **Fail securely** - reject invalid input rather than attempting to "fix" it

### Output Encoding
1. **Encode user data** when displaying in HTML
2. **Use context-appropriate encoding** (HTML, JavaScript, CSS, URLs)
3. **Never render unescaped user input** in sensitive contexts

### Monitoring and Logging
1. **Log validation failures** for security monitoring
2. **Monitor rate limiting** and abuse patterns
3. **Set up alerts** for suspicious validation activity

## Maintenance

### Regular Updates
- Review and update malicious patterns quarterly
- Adjust length limits based on legitimate usage
- Update validation rules for new features
- Monitor security advisories for new attack vectors

### Performance Considerations
- Validation adds minimal overhead (~1-2ms per request)
- Caching not recommended for security validation
- Monitor validation performance in production

## Compliance

This validation system helps with:
- **OWASP Top 10** mitigation (A03: Injection, A05: Security Misconfiguration)
- **GDPR** data protection requirements
- **PCI DSS** security standards for payment processing
- **SOC 2** security controls

## Troubleshooting

### Common Issues

1. **False Positives**: Adjust patterns if legitimate content is blocked
2. **Performance**: Monitor validation time for large inputs
3. **International Characters**: Ensure Unicode support is maintained
4. **Legacy Data**: Plan migration strategy for existing data

### Debug Mode

Enable debug logging for validation:
```typescript
// In development, add debug logging
if (process.env.NODE_ENV === 'development') {
  console.log('Validation result:', result)
}
```

## References

- [OWASP Input Validation](https://owasp.org/www-project-cheat-sheets/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [OWASP XSS Prevention](https://owasp.org/www-project-cheat-sheets/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [MDN Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

**Last Updated**: 2025-04-22  
**Version**: 1.0  
**Maintainer**: Security Team
