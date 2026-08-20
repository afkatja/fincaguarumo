import { useMutation, type UseMutationOptions } from '@tanstack/react-query'
import type { ChargeInput, ChargeResult } from '../types'

export interface UseChargeOptions extends Omit<UseMutationOptions<ChargeResult, Error, ChargeInput>, 'mutationFn'> {
  endpoint?: string
}

export function useCharge(options: UseChargeOptions = {}) {
  const { endpoint = '/api/pos/charge', ...mutationOptions } = options

  return useMutation<ChargeResult, Error, ChargeInput>({
    mutationFn: async (input: ChargeInput) => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        const error = new Error(data.error || 'Charge failed') as Error & {
          status: number
          details?: Array<{ field: string; message: string }>
        }
        error.status = response.status
        error.details = data.details
        throw error
      }

      return data as ChargeResult
    },
    onSuccess: (...args: Parameters<NonNullable<UseMutationOptions<ChargeResult, Error, ChargeInput>['onSuccess']>>) => {
      mutationOptions.onSuccess?.(...args)
    },
    onError: (...args: Parameters<NonNullable<UseMutationOptions<ChargeResult, Error, ChargeInput>['onError']>>) => {
      mutationOptions.onError?.(...args)
    },
    ...mutationOptions,
  })
}