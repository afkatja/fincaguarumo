"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { clientSideFetch } from "../../sanity/lib/clientSide"
import { DIALOG_QUERY } from "../../sanity/lib/queries"
import { IDialog, BookingType } from "../../types"
import { useBookingCore } from "./BookingCoreProvider"
import { clearCoreBookingDataFromLocalStorage } from "./BookingCoreProvider"
import { bookingEventBus, BookingEvent } from "./BookingEventBus"

interface DialogContextType {
  dialogData: IDialog | null
  setDialogId: (id: string | null) => void
  isLoading: boolean
  closeBookingDialog: () => void
  isBookingDialogOpen: boolean
  currentBookingType: BookingType | null
  activeDialogId: string | null
}

const DialogContext = createContext<DialogContextType>({
  dialogData: null,
  setDialogId: () => {},
  isLoading: false,
  closeBookingDialog: () => {},
  isBookingDialogOpen: false,
  currentBookingType: null,
  activeDialogId: null,
})

export const useDialog = () => useContext(DialogContext)

export const DialogProvider = ({ children }: { children: React.ReactNode }) => {
  const [dialogData, setDialogData] = useState<IDialog | null>(null)
  const [dialogId, setDialogId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false)
  const [activeDialogId, setActiveDialogId] = useState<string | null>(null)
  const [currentBookingType, setCurrentBookingType] =
    useState<BookingType | null>(null)

  const { resetAll, setBookingType } = useBookingCore()

  // Fallback dialog data for when Sanity fetch fails
  const getFallbackDialogData = (): IDialog => ({
    _id: "fallback-dialog",
    cta: [{ _key: "cta", value: "Book Now" }],
    date: [{ _key: "date", value: "Select Date" }],
    selectDate: [{ _key: "selectDate", value: "Select Date" }],
    guests: [{ _key: "guests", value: "Guests" }],
    adults: [{ _key: "adults", value: "Adults" }],
    adult: [{ _key: "adult", value: "Adult" }],
    child: [{ _key: "child", value: "Child" }],
    other: [{ _key: "other", value: "Other" }],
    paymentMethod: [{ _key: "paymentMethod", value: "Payment Method" }],
    creditCard: [{ _key: "creditCard", value: "Credit Card" }],
    paypal: [{ _key: "paypal", value: "PayPal" }],
    people: [{ _key: "people", value: "People" }],
    person: [{ _key: "person", value: "Person" }],
    total: [{ _key: "total", value: "Total" }],
    ok: [{ _key: "ok", value: "OK" }],
    cancel: [{ _key: "cancel", value: "Cancel" }],
  })

  const closeBookingDialog = () => {
    setIsBookingDialogOpen(false)
    setActiveDialogId(null)
    // reset everything and clear localStorage
    resetAll()
    clearCoreBookingDataFromLocalStorage()
  }

  // Listen for booking events instead of directly calling providers
  useEffect(() => {
    const handleBookingEvent = (event: BookingEvent) => {
      if (event.type === "DIALOG_OPEN_REQUESTED") {
        setCurrentBookingType(event.payload.bookingType)
        setBookingType(event.payload.bookingType)
        setIsBookingDialogOpen(true)
        setActiveDialogId(event.payload.dialogId || null)
      } else if (event.type === "DIALOG_CLOSE_REQUESTED") {
        setCurrentBookingType(null)
        closeBookingDialog()
      }
    }

    const unsubscribe = bookingEventBus.subscribe(handleBookingEvent)
    return unsubscribe
  }, [setBookingType, setIsBookingDialogOpen, closeBookingDialog])

  // Fetch generic dialog copy
  useEffect(() => {
    const fetchDialog = async () => {
      setIsLoading(true)
      try {
        const data = await clientSideFetch(DIALOG_QUERY)
        if (data) setDialogData(data)
      } catch (error) {
        console.error("Error fetching dialog:", error)
        setDialogData(getFallbackDialogData())
      } finally {
        setIsLoading(false)
      }
    }

    fetchDialog()
  }, [dialogId])

  return (
    <DialogContext.Provider
      value={{
        dialogData,
        setDialogId,
        isLoading,
        closeBookingDialog,
        isBookingDialogOpen,
        currentBookingType,
        activeDialogId,
      }}
    >
      {children}
    </DialogContext.Provider>
  )
}
