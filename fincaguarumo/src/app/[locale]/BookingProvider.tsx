"use client"
import { createContext, useContext, useState, useEffect } from "react"

const today = new Date()
const tomorrow = new Date(+today + 86400000)
const later = new Date(+today + 259200000)

const initialBookingData = {
  type: "tour",
  customerDetails: { name: "", email: "", phoneNumber: "" },
  bookingDetails: {
    title: "",
    description: "",
    duration: "",
    location: "",
    body: "",
    date: tomorrow.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    checkIn: tomorrow.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    checkOut: later.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    guests: "1",
    price: "0",
    totalPrice: "0",
    currency: "usd",
    geo: { lat: "", lon: "" },
  },
}
type BookingData = typeof initialBookingData

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

      return storedData ? JSON.parse(storedData) : initialBookingData
    }
    return null
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
