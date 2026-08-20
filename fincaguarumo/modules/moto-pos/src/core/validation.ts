import { ModuleConfig, ValidationError } from '../types'

export function validateAmount(amount: unknown, config: ModuleConfig): ValidationError | null {
  if (typeof amount !== 'number' || !Number.isInteger(amount)) {
    return { field: 'amount', message: 'Amount must be an integer' }
  }
  if (amount <= 0) {
    return { field: 'amount', message: 'Amount must be positive' }
  }
  if (amount > config.maxAmountCents) {
    return { field: 'amount', message: `Amount exceeds maximum of ${config.maxAmountCents} cents` }
  }
  return null
}

export function validateCurrency(currency: unknown, config: ModuleConfig): ValidationError | null {
  if (typeof currency !== 'string') {
    return { field: 'currency', message: 'Currency must be a string' }
  }
  const normalized = currency.toLowerCase()
  if (!config.allowedCurrencies.includes(normalized)) {
    return {
      field: 'currency',
      message: `Currency must be one of: ${config.allowedCurrencies.map(c => c.toUpperCase()).join(', ')}`,
    }
  }
  return null
}

export function validatePaymentMethodId(paymentMethodId: unknown): ValidationError | null {
  if (typeof paymentMethodId !== 'string' || !paymentMethodId.startsWith('pm_')) {
    return { field: 'paymentMethodId', message: 'Invalid payment method ID' }
  }
  return null
}

export function validateIdempotencyKey(idempotencyKey: unknown, config: ModuleConfig): ValidationError | null {
  if (typeof idempotencyKey !== 'string') {
    return { field: 'idempotencyKey', message: 'Idempotency key must be a string' }
  }
  const expectedPrefix = `${config.idempotencyPrefix}:`
  if (!idempotencyKey.startsWith(expectedPrefix)) {
    return {
      field: 'idempotencyKey',
      message: `Idempotency key must start with "${expectedPrefix}"`,
    }
  }
  return null
}

export function validateChargeInput(input: unknown, config: ModuleConfig): ValidationError[] {
  const errors: ValidationError[] = []

  if (!input || typeof input !== 'object') {
    return [{ field: 'root', message: 'Request body must be an object' }]
  }

  const body = input as Record<string, unknown>

  const amountError = validateAmount(body.amount, config)
  if (amountError) errors.push(amountError)

  const currencyError = validateCurrency(body.currency, config)
  if (currencyError) errors.push(currencyError)

  const pmError = validatePaymentMethodId(body.paymentMethodId)
  if (pmError) errors.push(pmError)

  const idemError = validateIdempotencyKey(body.idempotencyKey, config)
  if (idemError) errors.push(idemError)

  return errors
}