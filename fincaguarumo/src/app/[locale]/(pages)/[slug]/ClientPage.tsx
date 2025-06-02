"use client"
import React, { useEffect } from "react"
import RichText from "@/components/RichText"
import { BookingOptions } from "@/components/BookingOptions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog"
import { IBookingType } from "../../../../types"
import BookingDialog from "../Dialog"
import { Content } from "./page"
import { useBooking } from "../../BookingProvider"

const ClientPage = ({ content }: { content: Content }) => {
  const { bookingData, setBookingData } = useBooking()

  useEffect(() => {
    setBookingData({
      ...bookingData,
      bookingDetails: {
        title: content.title,
        description: content.description,
        price: content.price,
        body: content.body,
        guests: "1",
      },
    })
  }, [content])

  return (
    <>
      {content?.showBookingDialog && (
        <div className="w-11/12 flex justify-center mx-auto">
          <BookingDialog
            bookingType={IBookingType.villa}
            dialogOptions={{
              buttonText: "See availability",
              title: "Reserve Villa Bruno",
            }}
          />
        </div>
      )}
      <RichText body={content?.body} />
      {content?.showBookingOptions && (
        <Dialog>
          <DialogTrigger asChild>
            <div className="flex items-center sticky bottom-4 mb-2 mx-auto w-11/12">
              <Button size="lg" variant="secondary" className=" ml-auto">
                Book now
              </Button>
            </div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogTitle>Book Your Stay</DialogTitle>
            <div className="mt-8">
              <BookingOptions
                propertyId="your-booking-property-id"
                expediaPropertyId={
                  process.env.NEXT_PUBLIC_EXPEDIA_PROPERTY_ID || ""
                }
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

export default ClientPage
