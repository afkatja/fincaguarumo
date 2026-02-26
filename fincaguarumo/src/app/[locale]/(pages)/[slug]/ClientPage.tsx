"use client"
import { useEffect } from "react"
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
import { Content } from "./page"
import { useBooking } from "../../../providers/BookingProvider"
import FAQ from "@/components/FAQ"
import Title from "@/components/Title"
import Icon from "../../../../components/Icon"
import calculateTotal from "../../../../lib/calculateTotal"
import { SidebarChat } from "@/components/better-chatbot"

const ClientPage = ({
  content,
  locale,
}: {
  content: Content
  locale: string
}) => {
  const { bookingData, setBookingData } = useBooking()
  const { Link } = createNavigation()
  const t = useTranslations("booking")
  const tPage = useTranslations("page")

  useEffect(() => {
    // Only set booking data if this page has booking functionality
    if (content?.showBookingDialog && content?.price) {
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
    }
  }, [content, setBookingData])

  const guestsRaw = bookingData?.bookingDetails?.guests
  const guests = typeof guestsRaw === "number" && guestsRaw > 0 ? guestsRaw : 1

  const { total } = calculateTotal({
    price: content.price ?? 0,
    guests,
    bookingType: BOOKING_TYPE.villa,
  })

  return (
    <>
      <RichText body={content?.body} />

      {/* FAQ Section - Only show if enabled */}
      {content?.showFAQ && (
        <div className="w-11/12 mx-auto mt-3 mb-8 flex flex-col">
          <Title
            title={tPage("FAQ")}
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
              {tPage("moreFAQ")}
              <Icon
                icon="ArrowRight"
                className="h-8 w-8 transition-all group-hover:translate-x-3 stroke-guarumo-accent dark:stroke-zinc-50"
                color="currentColor"
              />
            </Link>
          </div>
        </div>
      )}

      {/* Booking Footer - Only show if booking is enabled */}
      {content?.showBookingDialog && content?.price && (
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
                  buttonText: t("bookNow"),
                  title: t("bookNow"),
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
                      {t("bookOnOthers")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[500px] md:max-w-[700px] md:w-[700px]">
                    <DialogTitle>{t("bookVilla")}</DialogTitle>
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

      {/* Chat Widget - Only show on relevant pages */}
      <SidebarChat
        propertyTitle={content.title || "Finca Guarumo"}
        initialMessage={tPage("greetings.general", {
          pageTitle: content.title || "Finca Guarumo",
        })}
      />
    </>
  )
}

export default ClientPage
