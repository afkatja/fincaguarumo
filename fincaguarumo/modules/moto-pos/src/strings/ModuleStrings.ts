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
}