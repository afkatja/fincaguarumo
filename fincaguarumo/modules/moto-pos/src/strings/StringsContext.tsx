import React, { createContext, useContext, useMemo, useCallback, type ReactNode } from 'react'
import { defaultStrings } from './ModuleStrings'
import type { ModuleStrings } from './ModuleStrings'

interface StringsContextValue {
  strings: ModuleStrings
  t: (key: string, params?: Record<string, string | number>) => string
}

const StringsContext = createContext<StringsContextValue | null>(null)

export interface StringsProviderProps {
  strings?: Partial<ModuleStrings>
  children: ReactNode
}

export function StringsProvider({ strings, children }: StringsProviderProps) {
  const mergedStrings = useMemo(() => deepMerge(defaultStrings, strings || {}), [strings])

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    const keys = key.split('.')
    let value: unknown = mergedStrings
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k]
      } else {
        return key
      }
    }
    if (typeof value === 'function') {
      return (value as (params?: Record<string, string | number>) => string)(params)
    }
    if (typeof value === 'string') {
      return value
    }
    return key
  }, [mergedStrings])

  return (
    <StringsContext.Provider value={{ strings: mergedStrings, t }}>
      {children}
    </StringsContext.Provider>
  )
}

export function useStrings(): StringsContextValue {
  const context = useContext(StringsContext)
  if (!context) {
    return { strings: defaultStrings, t: (key) => key }
  }
  return context
}

function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target } as Record<string, unknown>
  for (const key of Object.keys(source)) {
    const sourceValue = (source as Record<string, unknown>)[key]
    const targetValue = (target as Record<string, unknown>)[key]
    if (
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>)
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue
    }
  }
  return result as T
}

export { defaultStrings } from './ModuleStrings'
export type { ModuleStrings } from './ModuleStrings'