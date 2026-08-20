export interface ModuleStrings {
  panel: {
    title: string
    amountLabel: string
    amountHelper: string
    currencyLabel: string
    currencyPlaceholder: string
    paymentMethodLabel: string
    paymentMethodPlaceholder: string
    paymentMethodHelper: string
    idempotencyKeyLabel: string
    idempotencyKeyPlaceholder: string
    idempotencyKeyHelper: string
    chargeButton: string
    charging: string
  }
  charge: {
    success: string
    successMessage: (params: { id: string }) => string
    requiresAction: string
    requiresActionMessage: string
    failed: string
    failedMessage: (params: { status: string }) => string
    error: string
    missingFields: string
  }
  login: {
    title: string
    emailLabel: string
    emailPlaceholder: string
    passwordLabel: string
    passwordPlaceholder: string
    signInButton: string
    signingIn: string
    success: string
    welcome: (params: { email: string }) => string
    error: string
    failed: string
    configMissing: string
    configMissingMessage: string
  }
}

export const defaultStrings: ModuleStrings = {
  panel: {
    title: 'Manual Charge',
    amountLabel: 'Amount',
    amountHelper: 'Enter amount in dollars (will be converted to cents)',
    currencyLabel: 'Currency',
    currencyPlaceholder: 'Select currency',
    paymentMethodLabel: 'Payment Method ID',
    paymentMethodPlaceholder: 'pm_...',
    paymentMethodHelper: 'Stripe PaymentMethod ID (starts with pm_)',
    idempotencyKeyLabel: 'Idempotency Key',
    idempotencyKeyPlaceholder: 'booking-vcc:res_123:150000:usd',
    idempotencyKeyHelper: 'Unique key to prevent duplicate charges',
    chargeButton: 'Charge',
    charging: 'Charging...',
  },
  charge: {
    success: 'Charge Successful',
    successMessage: ({ id }) => `Payment ${id} completed successfully`,
    requiresAction: 'Action Required',
    requiresActionMessage: 'Additional authentication (3D Secure) is required',
    failed: 'Charge Failed',
    failedMessage: ({ status }) => `Payment status: ${status}`,
    error: 'Error',
    missingFields: 'Payment Method ID and Idempotency Key are required',
  },
  login: {
    title: 'Sign In',
    emailLabel: 'Email',
    emailPlaceholder: 'admin@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    signInButton: 'Sign In',
    signingIn: 'Signing in...',
    success: 'Signed In',
    welcome: ({ email }) => `Welcome back, ${email}`,
    error: 'Sign In Failed',
    failed: 'Invalid email or password',
    configMissing: 'Configuration Missing',
    configMissingMessage: 'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables are required',
  },
}