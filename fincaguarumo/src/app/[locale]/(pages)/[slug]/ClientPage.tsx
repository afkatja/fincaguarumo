"use client"
import React, { useEffect } from "react"
import { createNavigation } from "next-intl/navigation"
import RichText from "@/components/RichText"
import { BookingOptions } from "@/components/BookingOptions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog"
import { BOOKING_TYPE, BookingData, FAQType } from "@/types"
import BookingDialog from "../BookingDialog"
import { Content } from "./page"
import { useBooking } from "../../../providers/BookingProvider"
import FAQ from "@/components/FAQ"
import Title from "@/components/Title"
import Icon from "../../../../components/Icon"
import { APIProvider } from "@vis.gl/react-google-maps"
import { PlaceProvider } from "../../../providers/PlaceProvider"
import { placeId } from "../../../../../data/geo"
import { PlaceReviews } from "../../../../components/PlaceReviews"
import calculateTotal from "../../../../lib/calculateTotal"

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
  const { setBookingData } = useBooking()
  const { Link } = createNavigation()
  const t = messages?.booking

  useEffect(() => {
    setBookingData((prev: BookingData) => {
      const nextBookingDetails = {
        ...(prev?.bookingDetails ?? {}),
        type: BOOKING_TYPE.villa,
        title: content.title,
        description: content.description,
        price: content.price ?? 0,
        body: content.body,
        guests: 1,
        location: "Finca Guarumo",
      }
      if (
        JSON.stringify(prev.bookingDetails) ===
        JSON.stringify(nextBookingDetails)
      ) {
        return prev
      }
      return { ...prev, bookingDetails: nextBookingDetails }
    })
  }, [content, setBookingData])
  const { total } = calculateTotal(content.price ?? 0, 2, BOOKING_TYPE.villa)
  return (
    <>
      <RichText body={content?.body} />
      <div className="w-11/12 mx-auto my-8">
        <APIProvider
          apiKey={process.env.NEXT_PUBLIC_GMAPS_API_KEY as string}
          onLoad={() => console.log("Maps API has loaded.")}
        >
          <PlaceProvider placeId={placeId}>
            <PlaceReviews count={4} />
          </PlaceProvider>
        </APIProvider>
        <Link
          href={`/faq`}
          className="w-80 inline-flex ml-auto items-center justify-center h-full group no-underline"
        >
          Read more reviews
          <Icon
            icon="ArrowRight"
            className="h-8 w-8 transition-all group-hover:translate-x-3 stroke-guarumo-accent dark:stroke-zinc-50"
            color="currentColor"
          />
        </Link>
      </div>
      <div className="w-11/12 mx-auto mt-3 mb-8 flex flex-col">
        <Title
          title={t?.page?.FAQ || "FAQ"}
          Heading="h2"
          titleClassName="text-3xl font-bold text-guarumo-primary dark:text-zinc-50"
          icon={{ title: "Guarumo" }}
        />
        <div className="md:grid md:col-span-2 items-center gap-2 mt-4">
          {content?.faq && content?.faq.length > 0 && (
            <FAQ faqs={content.faq} />
          )}
          <Link
            href={`/faq`}
            className="w-80 inline-flex items-center justify-center h-full group no-underline"
          >
            {t?.page?.moreFAQ || "More FAQ"}
            <Icon
              icon="ArrowRight"
              className="h-8 w-8 transition-all group-hover:translate-x-3 stroke-guarumo-accent dark:stroke-zinc-50"
              color="currentColor"
            />
          </Link>
        </div>
      </div>
      <footer className="w-11/12 mx-auto pt-4 pb-6 sticky bottom-0 bg-zinc-50 dark:bg-zinc-800">
        {content?.showBookingDialog && (
          <p className="font-bold text-center mb-4">
            Price starting from $ {Math.floor(total)} (for 2 people)
          </p>
        )}
        <div className="flex items-center justify-center gap-4">
          {content?.showBookingDialog && (
            <BookingDialog
              bookingType={BOOKING_TYPE.villa}
              dialogOptions={{
                buttonText: t?.bookNow || "Book now",
                title: t?.bookNow || "Reserve Villa Bruno directly",
              }}
              locale={locale}
            />
          )}
          {content?.showBookingOptions && (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  size="lg"
                  variant="outline"
                  name="book-on-others-button"
                >
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
        </div>
      </footer>
    </>
  )
}

export default ClientPage
