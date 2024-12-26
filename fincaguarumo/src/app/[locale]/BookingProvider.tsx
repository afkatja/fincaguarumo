"use client"
import { createContext, useContext, useState, useEffect } from "react"

const BookingContext = createContext({
  bookingData: {
    customerDetails: { name: "", email: "" },
    tourDetails: {
      title: "",
      description: "",
      duration: "",
      location: "",
      body: "",
      date: new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      guests: "1",
      price: "0",
      geo: { lat: "", lon: "" },
    },
  },
  setBookingData: (val: any) => val,
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
      return storedData ? JSON.parse(storedData) : null
    }
    return null
  })

  useEffect(() => {
    console.log("booking provider", bookingData)
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
