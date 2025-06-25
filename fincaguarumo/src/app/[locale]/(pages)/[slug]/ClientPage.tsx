"use client"
import React, { useEffect } from "react"
import RichText from "@/components/RichText"
import { BookingOptions } from "@/components/BookingOptions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
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
      type: IBookingType.villa,
      bookingDetails: {
        ...bookingData.bookingDetails,
        title: content.title,
        description: content.description,
        price: content.price,
        body: content.body,
        guests: "1",
        location: "Finca Guarumo",
      },
    })
  }, [content])

  return (
    <>
      <RichText body={content?.body} />
      <footer className="w-11/12 flex justify-center gap-4 mx-auto my-3 sticky bottom-4">
        {content?.showBookingDialog && (
          <BookingDialog
            bookingType={IBookingType.villa}
            dialogOptions={{
              buttonText: "Book directly on this site",
              title: "Reserve Villa Bruno directly",
            }}
          />
        )}
        {content?.showBookingOptions && (
          <Dialog>
            <DialogTrigger asChild>
              <Button size="lg" variant="outline">
                Book on other platforms
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[500px] md:max-w-[700px] md:w-[700px]">
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
      </footer>
    </>
  )
}

export default ClientPage
