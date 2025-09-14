"use client"
import { createContext, useContext, useState, useEffect } from "react"
import {
  BookingData,
  initialBookingData,
  loadBookingDataFromLocalStorage,
  saveBookingDataToLocalStorage,
} from "../../types"

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
  const [bookingData, setBookingData] = useState<BookingData>(() => {
    const storedData = loadBookingDataFromLocalStorage()
    return storedData || initialBookingData
  })

  useEffect(() => {
    if (bookingData) {
      saveBookingDataToLocalStorage(bookingData)
    }
  }, [bookingData])

  return (
    <BookingContext.Provider value={{ bookingData, setBookingData }}>
      {children}
    </BookingContext.Provider>
  )
}
