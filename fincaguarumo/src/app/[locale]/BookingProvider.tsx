"use client"
import { createContext, useContext, useState, useEffect } from "react"
import { BookingData, initialBookingData } from "../../types"

const today = new Date()

const BookingContext = createContext<{
  bookingData: BookingData
  setBookingData: React.Dispatch<React.SetStateAction<BookingData>>
}>({
  bookingData: initialBookingData,
  setBookingData: () => {},
})

export const useBooking = () => useContext(BookingContext)

export const BookingProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [bookingData, setBookingData] = useState(() => {
    if (typeof window !== "undefined") {
      const storedData = localStorage.getItem("bookingData")
      if (storedData) {
        try {
          return JSON.parse(storedData)
        } catch {
          // ignore corrupted data
        }
      }
    }
    return initialBookingData
  })

  useEffect(() => {
    if (bookingData) {
      localStorage.setItem("bookingData", JSON.stringify(bookingData))
    }
  }, [bookingData])

  return (
    <BookingContext.Provider value={{ bookingData, setBookingData }}>
      {children}
    </BookingContext.Provider>
  )
}
