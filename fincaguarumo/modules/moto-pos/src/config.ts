import { ModuleConfig } from './types'

export const defaultConfig: ModuleConfig = {
  maxAmountCents: 1_000_000,
  allowedCurrencies: ['usd', 'eur', 'gbp', 'crc'],
  idempotencyPrefix: 'booking-vcc',
}

export function getConfigFromEnv(): Partial<ModuleConfig> {
  const config: Partial<ModuleConfig> = {}

  if (process.env.MOTO_POS_MAX_AMOUNT_CENTS) {
    config.maxAmountCents = parseInt(process.env.MOTO_POS_MAX_AMOUNT_CENTS, 10)
  }

  if (process.env.MOTO_POS_ALLOWED_CURRENCIES) {
    config.allowedCurrencies = process.env.MOTO_POS_ALLOWED_CURRENCIES.split(',').map(c => c.trim().toLowerCase())
  }

  if (process.env.MOTO_POS_IDEMPOTENCY_PREFIX) {
    config.idempotencyPrefix = process.env.MOTO_POS_IDEMPOTENCY_PREFIX
  }

  return config
}

export function mergeConfig(userConfig?: Partial<ModuleConfig>): ModuleConfig {
  const envConfig = getConfigFromEnv()
  return {
    ...defaultConfig,
    ...envConfig,
    ...userConfig,
  }
}