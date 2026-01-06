# End-to-End Testing

This directory contains Playwright-based end-to-end tests for the Finca Guarumo application.

## Test Suites

### Booking Process (`booking-process.spec.ts`)
- Complete villa booking flow from homepage to payment
- Form validation error handling
- Calendar date selection and navigation

### Contact Form (`contact-form.spec.ts`)
- Contact form submission with success feedback
- Required field validation
- Email format validation
- Contact information display

### Multi-language Navigation (`multi-language.spec.ts`)
- Language switching functionality
- Page context preservation during language changes
- 404 page handling in different languages
- Query parameter preservation
- Locale-specific formatting

### Payment Flow (`payment-flow.spec.ts`)
- Payment page loading with booking details
- Stripe Elements integration
- Payment success/failure handling
- Form validation

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (visible browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test booking-process.spec.ts

# Generate test report
npx playwright show-report
```

## Configuration

Tests are configured in `playwright.config.ts` with:
- Next.js dev server auto-start
- Multiple browser support (Chromium, Firefox, WebKit)
- Mobile viewport testing
- Trace collection on failures

## Test Environment Setup

### Prerequisites
- Node.js and npm installed
- Playwright browsers installed (`npx playwright install`)

### Environment Variables
The tests use the same environment variables as the main application:
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_GMAPS_API_KEY`
- Database and API configurations

## Test Data

Tests use realistic test data and interact with actual application flows. Some tests may require:
- Valid booking data for payment testing
- Stripe test environment for payment flows
- Google Maps API for location features

## CI/CD Integration

Tests are configured to run in CI environments with:
- Parallel test execution
- Automatic retry on failures
- HTML report generation
- Screenshot/video capture on failures

## Best Practices

- Tests use semantic selectors (`getByRole`, `getByLabel`) for better maintainability
- Tests are written to be resilient to UI changes
- Complex user flows are broken into logical test steps
- Tests include proper assertions and error handling