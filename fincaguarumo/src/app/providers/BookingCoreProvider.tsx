"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react"
import { BookingType } from "../../types"
import { PricingRule } from "../../lib/pricingEngine"

export interface CoreBookingData {
  bookingType: BookingType | null
  bookingDetails: {
    title: string
    description: string
    location: string
  }
  dates: {
    date: Date | null // tours
    checkIn: Date | null // villas
    checkOut: Date | null // villas
  }
  guests: number
  customerDetails: {
    name: string
    email: string
    phoneNumber: string
  }
  locale: string
  coupon?: string
  notes?: string
  source: "page" | "external" | null
  // pricing
  baseUnitPrice: number // per person (tour)
  pricingRules: PricingRule[]
  totalPrice: number
  currency: string
}

export interface CoreBookingState {
  data: CoreBookingData
  isLoading: boolean
  validationStatus: {
    dates: boolean
    guests: boolean
    customer: boolean
  }
}

const initialCoreData: CoreBookingData = {
  bookingType: null,
  bookingDetails: {
    title: "",
    description: "",
    location: "",
  },
  dates: {
    date: null,
    checkIn: null,
    checkOut: null,
  },
  guests: 1,
  customerDetails: {
    name: "",
    email: "",
    phoneNumber: "",
  },
  locale: "en",
  coupon: undefined,
  notes: undefined,
  source: null,
  baseUnitPrice: 0,
  pricingRules: [],
  totalPrice: 0,
  currency: "USD",
}

const initialCoreState: CoreBookingState = {
  data: initialCoreData,
  isLoading: false,
  validationStatus: {
    dates: false,
    guests: false,
    customer: false,
  },
}

type BookingCoreContextValue = {
  state: CoreBookingState
  // narrow setters
  setBookingType: (type: BookingType) => void
  setBasicDetails: (details: Partial<CoreBookingData["bookingDetails"]>) => void
  setDates: (dates: Partial<CoreBookingData["dates"]>) => void
  setGuests: (guests: number) => void
  setCustomerDetails: (
    customer: Partial<CoreBookingData["customerDetails"]>,
  ) => void
  setPricing: (updates: {
    baseUnitPrice?: number
    currency?: string
    pricingRules?: PricingRule[]
  }) => void
  setLocale: (locale: string) => void
  setMeta: (meta: {
    coupon?: string
    notes?: string
    source?: "page" | "external"
  }) => void
  resetAll: () => void
  persistToStorage: () => void
}

const BookingCoreContext = createContext<BookingCoreContextValue>({
  state: initialCoreState,
  setBookingType: () => {},
  setBasicDetails: () => {},
  setDates: () => {},
  setGuests: () => {},
  setCustomerDetails: () => {},
  setPricing: () => {},
  setLocale: () => {},
  setMeta: () => {},
  resetAll: () => {},
  persistToStorage: () => {},
})

export const useBookingCore = () => useContext(BookingCoreContext)

// LocalStorage helpers (single object)
const STORAGE_KEY = "bookingCoreData"

export function saveCoreBookingDataToLocalStorage(data: CoreBookingData): void {
  if (typeof window === "undefined") return

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      core: {
        ...data,
        dates: {
          date: data.dates.date?.toISOString() || null,
          checkIn: data.dates.checkIn?.toISOString() || null,
          checkOut: data.dates.checkOut?.toISOString() || null,
        },
      },
    }),
  )
}

export function loadCoreBookingDataFromLocalStorage(): CoreBookingData | null {
  if (typeof window === "undefined") return null

  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return null

  try {
    const parsed = JSON.parse(stored)
    if (parsed.core) {
      const core = parsed.core as CoreBookingData & {
        dates: {
          date: string | null
          checkIn: string | null
          checkOut: string | null
        }
      }
      return {
        ...core,
        dates: {
          date: core.dates.date ? new Date(core.dates.date) : null,
          checkIn: core.dates.checkIn ? new Date(core.dates.checkIn) : null,
          checkOut: core.dates.checkOut ? new Date(core.dates.checkOut) : null,
        },
      }
    }
  } catch {
    // ignore
  }

  return null
}

export function clearCoreBookingDataFromLocalStorage() {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEY)
}

export const BookingCoreProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [state, setState] = useState<CoreBookingState>(() => {
    const stored = loadCoreBookingDataFromLocalStorage()
    return {
      data: stored || initialCoreData,
      isLoading: false,
      validationStatus: {
        dates: false,
        guests: false,
        customer: false,
      },
    }
  })

  // recompute totalPrice whenever baseUnitPrice or guests change
  useEffect(() => {
    setState(prev => {
      const { baseUnitPrice, guests, bookingType } = prev.data
      let totalPrice: number

      if (bookingType === "tour") {
        // Tour pricing: basePrice * guests + 13% VAT
        const priceForPeople = baseUnitPrice * Math.max(guests, 1)
        totalPrice = priceForPeople * 1.13 // 13% VAT
      } else {
        // Villa pricing: basePrice * guests (VAT handled separately by pricing engine)
        totalPrice = baseUnitPrice * Math.max(guests, 1)
      }

      if (totalPrice === prev.data.totalPrice) return prev
      return {
        ...prev,
        data: { ...prev.data, totalPrice },
      }
    })
  }, [state.data.baseUnitPrice, state.data.guests, state.data.bookingType])

  // validation
  useEffect(() => {
    setState(prev => {
      const d = prev.data
      const datesValid =
        d.bookingType === "villa"
          ? !!(d.dates.checkIn && d.dates.checkOut)
          : !!d.dates.date
      const guestsValid = d.guests > 0
      const customerValid = !!(
        d.customerDetails.name && d.customerDetails.email
      )

      return {
        ...prev,
        validationStatus: {
          dates: datesValid,
          guests: guestsValid,
          customer: customerValid,
        },
      }
    })
  }, [
    state.data.bookingType,
    state.data.dates,
    state.data.guests,
    state.data.customerDetails,
  ])

  // Note: localStorage persistence is now handled manually in form submission
  // This effect has been removed to prevent infinite loops

  const patchData = useCallback((patch: Partial<CoreBookingData>) => {
    setState(prev => ({
      ...prev,
      data: { ...prev.data, ...patch },
    }))
  }, [])

  const setBookingType = useCallback(
    (type: BookingType) => {
      patchData({ bookingType: type })
    },
    [patchData],
  )

  const setBasicDetails: BookingCoreContextValue["setBasicDetails"] =
    useCallback(details => {
      setState(prev => ({
        ...prev,
        data: {
          ...prev.data,
          bookingDetails: {
            ...prev.data.bookingDetails,
            ...details,
          },
        },
      }))
    }, [])

  const setDates: BookingCoreContextValue["setDates"] = useCallback(dates => {
    setState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        dates: {
          ...prev.data.dates,
          ...dates,
        },
      },
    }))
  }, [])

  const setGuests = useCallback(
    (guests: number) => {
      patchData({ guests })
    },
    [patchData],
  )

  const setCustomerDetails: BookingCoreContextValue["setCustomerDetails"] =
    useCallback(customer => {
      setState(prev => ({
        ...prev,
        data: {
          ...prev.data,
          customerDetails: {
            ...prev.data.customerDetails,
            ...customer,
          },
        },
      }))
    }, [])

  const setPricing: BookingCoreContextValue["setPricing"] = useCallback(
    updates => {
      setState(prev => ({
        ...prev,
        data: {
          ...prev.data,
          baseUnitPrice: updates.baseUnitPrice ?? prev.data.baseUnitPrice,
          currency: updates.currency ?? prev.data.currency,
          pricingRules: updates.pricingRules ?? prev.data.pricingRules,
        },
      }))
    },
    [],
  )

  const setLocale = useCallback(
    (locale: string) => {
      patchData({ locale })
    },
    [patchData],
  )

  const setMeta: BookingCoreContextValue["setMeta"] = useCallback(
    meta => {
      patchData({
        coupon: meta.coupon ?? state.data.coupon,
        notes: meta.notes ?? state.data.notes,
        source: meta.source ?? state.data.source,
      })
    },
    [patchData, state.data.coupon, state.data.notes, state.data.source],
  )

  const resetAll = useCallback(() => {
    clearCoreBookingDataFromLocalStorage()
    setState({
      data: initialCoreData,
      isLoading: false,
      validationStatus: {
        dates: false,
        guests: false,
        customer: false,
      },
    })
  }, [])

  const persistToStorage = useCallback(() => {
    if (state.data.bookingType) {
      saveCoreBookingDataToLocalStorage(state.data)
    }
  }, [state.data])

  const contextValue = useMemo(
    () => ({
      state,
      setBookingType,
      setBasicDetails,
      setDates,
      setGuests,
      setCustomerDetails,
      setPricing,
      setLocale,
      setMeta,
      resetAll,
      persistToStorage,
    }),
    [
      state,
      setBookingType,
      setBasicDetails,
      setDates,
      setGuests,
      setCustomerDetails,
      setPricing,
      setLocale,
      setMeta,
      resetAll,
      persistToStorage,
    ],
  )

  return (
    <BookingCoreContext.Provider value={contextValue}>
      {children}
    </BookingCoreContext.Provider>
  )
}
