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
import BookingDialog from "../BookingDialog"
import { Content } from "./page"
import { useBooking } from "../../BookingProvider"

type Messages = {
  booking?: {
    bookNow?: string
    [key: string]: any
  }
  [key: string]: any
}

const ClientPage = ({
  content,
  locale,
  messages,
}: {
  content: Content
  locale: string
  messages: Messages
}) => {
  const { bookingData, setBookingData } = useBooking()
  const t = messages?.booking

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
              buttonText: t?.bookNow || "Book now",
              title: t?.bookNow || "Reserve Villa Bruno directly",
            }}
            price={content.price || 0}
            locale={locale}
          />
        )}
        {content?.showBookingOptions && (
          <Dialog>
            <DialogTrigger asChild>
              <Button size="lg" variant="outline">
                {t?.bookOnOthers}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[500px] md:max-w-[700px] md:w-[700px]">
              <DialogTitle>{t?.bookVilla}</DialogTitle>
              <div className="mt-8">
                <BookingOptions
                  locale={locale}
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
