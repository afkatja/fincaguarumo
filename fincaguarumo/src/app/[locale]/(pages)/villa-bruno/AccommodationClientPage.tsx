"use client"
import React, { useEffect } from "react"
import { createNavigation } from "next-intl/navigation"
import { useTranslations } from "next-intl"
import RichText from "@/components/RichText"
import { BookingOptions } from "@/components/BookingOptions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog"
import { BOOKING_TYPE, BookingData } from "@/types"
import BookingDialog from "../BookingDialog"
import { AccommodationContent } from "./page"
import { useBooking } from "../../../providers/BookingProvider"
import FAQ from "@/components/FAQ"
import Title from "@/components/Title"
import Icon from "../../../../components/Icon"
import { APIProvider } from "@vis.gl/react-google-maps"
import { PlaceProvider } from "../../../providers/PlaceProvider"
import { placeId } from "../../../../../data/geo"
import { PlaceReviews } from "../../../../components/PlaceReviews"
import calculateTotal from "../../../../lib/calculateTotal"
import { QuickInfoBar } from "@/components/QuickInfoBar"
import { ReviewSummary } from "@/components/ReviewSummary"
import { ContentPreview } from "@/components/ContentPreview"
import { CollapsibleSection } from "@/components/CollapsibleSection"
import InPageNavigation from "@/components/InPageNavigation"

const AccommodationClientPage = ({
  content,
  locale,
}: {
  content: AccommodationContent
  locale: string
}) => {
  const { bookingData, setBookingData } = useBooking()
  const { Link } = createNavigation()
  const t = useTranslations("booking")
  const b = useTranslations("reviews")
  const tPage = useTranslations("page")

  const googleMapsKey = process.env.NEXT_PUBLIC_GMAPS_API_KEY as string

  // Define navigation sections with translatable labels
  const navigationSections = [
    { id: "quick-info", label: tPage("quickInfo") || "Quick Info" },
    { id: "reviews-summary", label: tPage("reviews") || "Reviews" },
    { id: "about", label: tPage("about") || "About" },
    { id: "full-content", label: tPage("details") || "Details" },
    { id: "faq", label: tPage("FAQ") || "FAQ" },
    { id: "reviews", label: tPage("allReviews") || "More Reviews" },
  ]

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

  const guestsRaw = bookingData?.bookingDetails?.guests
  const guests = typeof guestsRaw === "number" && guestsRaw > 0 ? guestsRaw : 1

  const { total } = calculateTotal(
    content.price ?? 0,
    guests,
    BOOKING_TYPE.villa,
  )

  return (
    <>
      {/* In-Page Navigation */}
      <InPageNavigation sections={navigationSections} />

      {/* Quick Info Bar - Essential information above the fold */}
      <div id="quick-info" className="w-11/12 mx-auto my-6">
        <CollapsibleSection
          title="Quick Info"
          defaultExpanded={true}
          className="bg-linear-to-r from-guarumo-primary/10 to-guarumo-accent/10"
        >
          <QuickInfoBar content={content} price={total} guests={guests} />
        </CollapsibleSection>
      </div>

      {/* Reviews Section - Prominently placed with summary */}
      {googleMapsKey && (
        <div id="reviews-summary" className="w-11/12 mx-auto my-8">
          <CollapsibleSection title="Reviews" defaultExpanded={false}>
            <APIProvider
              apiKey={googleMapsKey}
              // onLoad={() => console.log("Maps API has loaded.")}
            >
              <PlaceProvider placeId={placeId}>
                <ReviewSummary
                  count={4}
                  highlightFeatures={content.highlightFeatures}
                  readMoreSection="reviews"
                />
              </PlaceProvider>
            </APIProvider>
          </CollapsibleSection>
        </div>
      )}

      {/* Content Preview - First few sections of Sanity content */}
      <div id="about" className="w-11/12 mx-auto mb-6">
        <CollapsibleSection
          title="About this accommodation"
          defaultExpanded={false}
        >
          <ContentPreview summary={content.summary} />
        </CollapsibleSection>
      </div>

      {/* Full Content - Complete Sanity body content */}
      <div id="full-content">
        <RichText body={content?.body} />
      </div>

      {/* FAQ Section */}
      <div id="faq" className="w-11/12 mx-auto mt-3 mb-8 flex flex-col">
        <Title
          title={tPage("FAQ") || "FAQ"}
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
            {tPage("moreFAQ") || "More FAQ"}
            <Icon
              icon="ArrowRight"
              className="h-8 w-8 transition-all group-hover:translate-x-3 stroke-guarumo-accent dark:stroke-zinc-50"
              color="currentColor"
            />
          </Link>
        </div>
      </div>
      <div id="reviews">
        <APIProvider
          apiKey={googleMapsKey}
          // onLoad={() => console.log("Maps API has loaded.")}
        >
          <PlaceProvider placeId={placeId}>
            <PlaceReviews count={4} />
          </PlaceProvider>
        </APIProvider>
        <Link
          href={`/reviews`}
          className="w-80 inline-flex ml-auto items-center justify-center h-full group no-underline"
        >
          {b("readMoreReviews") || "Read more reviews"}
          <Icon
            icon="ArrowRight"
            className="h-8 w-8 transition-all group-hover:translate-x-3 stroke-guarumo-accent dark:stroke-zinc-50"
            color="currentColor"
          />
        </Link>
      </div>

      {/* Booking Footer - Sticky booking options */}
      {content?.showBookingDialog && (
        <footer className="pt-4 pb-6 sticky bottom-0 bg-gradient-dark shadow-sm">
          <div className="w-11/12 mx-auto">
            <p className="font-bold text-center mb-4">
              Price starting from $ {Math.floor(total)} (for {guests}{" "}
              {guests === 1 ? "person" : "people"})
            </p>
            <div className="flex items-center justify-center gap-4">
              <BookingDialog
                bookingType={BOOKING_TYPE.villa}
                dialogOptions={{
                  buttonText: t("bookNow") || "Book now",
                  title: t("bookNow") || "Book now",
                }}
                locale={locale}
              />
              {content?.showBookingOptions && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      size="lg"
                      variant="outline"
                      name="book-on-others-button"
                    >
                      {t("bookOnOthers") || "Book on other platforms"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[500px] md:max-w-[700px] md:w-[700px]">
                    <DialogTitle>
                      {t("bookVilla") || "Book your stay"}
                    </DialogTitle>
                    <div className="mt-8">
                      <BookingOptions
                        locale={locale}
                        expediaPropertyId={
                          process.env.NEXT_PUBLIC_EXPEDIA_PROPERTY_ID || ""
                        }
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </footer>
      )}
    </>
  )
}

export default AccommodationClientPage
