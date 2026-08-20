import React, { useState, useCallback } from 'react'
import { useCharge } from './useCharge'
import { Input, Select, Button, StatusAlert, Card, CardContent, CardHeader, CardTitle } from './primitives'
import { useStrings } from '../strings'
import './MotoChargePanel.css'

export interface MotoChargePanelProps {
  defaultAmount?: number
  defaultCurrency?: string
  onSuccess?: (result: { paymentIntentId: string; status: string }) => void
  onError?: (error: Error) => void
  onRequiresAction?: (clientSecret: string, paymentIntentId: string) => void
  className?: string
  disabled?: boolean
}

const CURRENCY_OPTIONS = [
  { value: 'usd', label: 'USD ($)' },
  { value: 'eur', label: 'EUR (€)' },
  { value: 'gbp', label: 'GBP (£)' },
  { value: 'crc', label: 'CRC (₡)' },
]

export function MotoChargePanel({
  defaultAmount = 0,
  defaultCurrency = 'usd',
  onSuccess,
  onError,
  onRequiresAction,
  className = '',
  disabled = false,
}: MotoChargePanelProps) {
  const { t } = useStrings()
  const [amount, setAmount] = useState(defaultAmount)
  const [currency, setCurrency] = useState(defaultCurrency)
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [idempotencyKey, setIdempotencyKey] = useState('')
  const [alert, setAlert] = useState<{ variant: 'success' | 'error' | 'warning' | 'info'; title: string; message: string } | null>(null)

  const chargeMutation = useCharge({
    onSuccess: (result: { paymentIntentId: string; status: string; clientSecret?: string }) => {
      if (result.status === 'succeeded') {
        setAlert({ variant: 'success', title: t('charge.success'), message: t('charge.successMessage', { id: result.paymentIntentId }) })
        onSuccess?.(result)
      } else if (result.status === 'requires_action') {
        setAlert({ variant: 'warning', title: t('charge.requiresAction'), message: t('charge.requiresActionMessage') })
        onRequiresAction?.(result.clientSecret!, result.paymentIntentId)
      } else {
        setAlert({ variant: 'error', title: t('charge.failed'), message: t('charge.failedMessage', { status: result.status }) })
      }
    },
    onError: (error: Error & { status?: number; details?: Array<{ field: string; message: string }> }) => {
      let message = error.message
      if (error.details && error.details.length > 0) {
        message = error.details.map(d => `${d.field}: ${d.message}`).join(', ')
      }
      setAlert({ variant: 'error', title: t('charge.error'), message })
      onError?.(error)
    },
  })

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentMethodId.trim() || !idempotencyKey.trim()) {
      setAlert({ variant: 'error', title: t('charge.error'), message: t('charge.missingFields') })
      return
    }

    const amountCents = Math.round(amount * 100)
    chargeMutation.mutate({
      amount: amountCents,
      currency,
      paymentMethodId: paymentMethodId.trim(),
      idempotencyKey: idempotencyKey.trim(),
    })
  }, [amount, currency, paymentMethodId, idempotencyKey, chargeMutation, t])

  const dismissAlert = useCallback(() => {
    setAlert(null)
  }, [])

  return (
    <Card variant="default" padding="md" className={`moto-pos-charge-panel ${className}`}>
      <CardHeader>
        <CardTitle>{t('panel.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="moto-pos-charge-form">
          <div className="moto-pos-charge-form-grid">
            <Input
              label={t('panel.amountLabel')}
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              helperText={t('panel.amountHelper')}
              disabled={disabled || chargeMutation.isPending}
            />

            <Select
              label={t('panel.currencyLabel')}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              options={CURRENCY_OPTIONS}
              placeholder={t('panel.currencyPlaceholder')}
              disabled={disabled || chargeMutation.isPending}
            />

            <Input
              label={t('panel.paymentMethodLabel')}
              type="text"
              value={paymentMethodId}
              onChange={(e) => setPaymentMethodId(e.target.value)}
              placeholder={t('panel.paymentMethodPlaceholder')}
              helperText={t('panel.paymentMethodHelper')}
              disabled={disabled || chargeMutation.isPending}
            />

            <Input
              label={t('panel.idempotencyKeyLabel')}
              type="text"
              value={idempotencyKey}
              onChange={(e) => setIdempotencyKey(e.target.value)}
              placeholder={t('panel.idempotencyKeyPlaceholder')}
              helperText={t('panel.idempotencyKeyHelper')}
              disabled={disabled || chargeMutation.isPending}
            />
          </div>

          {alert && (
            <StatusAlert
              variant={alert.variant}
              title={alert.title}
              message={alert.message}
              dismissible
              onDismiss={dismissAlert}
              className="moto-pos-charge-alert"
            />
          )}

          <div className="moto-pos-charge-actions">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={chargeMutation.isPending}
              disabled={disabled}
            >
              {chargeMutation.isPending ? t('panel.charging') : t('panel.chargeButton')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}