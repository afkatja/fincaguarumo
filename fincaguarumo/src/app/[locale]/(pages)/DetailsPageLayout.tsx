"use client"
import React, { Suspense, useEffect, useState } from "react"

import BookingDialog from "./BookingDialog"

import Icon from "@/components/Icon"
import { TTour } from "./tours/data"
import Breadcrumbs from "@/components/Breadcrumbs"
import Title from "@/components/Title"
import Loading from "./loading"
import RichText from "@/components/RichText"
import { BookingType } from "../../../types"
import { loadTranslations } from "@/lib/utils"

const DetailsPageLayout = ({
  bookingDetails,
  bookingType,
  slideshow,
  parent,
  icon,
  locale,
  dialogId,
}: {
  bookingDetails: Omit<
    TTour,
    "gallery" | "isPublished" | "slug" | "mainImage" | "slideshow"
  >
  bookingType: BookingType
  slideshow?: React.ReactNode
  parent?: { title: string; href: string }
  icon?: string
  locale: string
  dialogId?: string
}) => {
  const { title, description, duration, location, price, body } = bookingDetails
  const [translations, setTranslations] = useState<{
    booking: {
      perPerson: string
      reserveButton: string
    }
  } | null>(null)

  useEffect(() => {
    const loadTranslationsData = async () => {
      const messages = await loadTranslations(locale)
      setTranslations(messages)
    }
    loadTranslationsData()
  })
  const t = translations?.booking

  return (
    <Suspense fallback={<Loading />}>
      <div className="content-wrap">
        <div className="w-11/12 mx-auto py-5">
          {parent && <Breadcrumbs title={title} parent={parent} />}
          <Title
            title={title}
            titleClassName="text-3xl font-bold my-5"
            icon={{ iconClassName: "fill-accent dark:fill-zinc-50" }}
          />
        </div>
        {slideshow}
        <section className="prose prose-sky dark:prose-invert lg:prose-lg mt-5 mx-auto w-11/12">
          <div className="grid md:grid-cols-2 gap-8 mt-8 md:mt-12">
            <div>
              <h4 className="text-muted-foreground mt-2">{description}</h4>
              <div className="flex items-center gap-4 mt-4">
                {duration && (
                  <div className="flex items-center gap-1">
                    <Icon
                      icon="Clock"
                      className="h-5 w-5 text-primary dark:text-zinc-50"
                    />
                    <span>{duration}</span>
                  </div>
                )}
                {location && (
                  <div className="flex items-center gap-1">
                    <Icon
                      icon="Pin"
                      className="h-5 w-5 text-primary dark:text-zinc-50"
                    />
                    <span>{location}</span>
                  </div>
                )}
              </div>
            </div>
            <footer className="bg-muted dark:bg-gradient-to-br from-zinc-700 to-sky-900 rounded-lg p-6 md:p-8">
              <div className="flex items-center justify-between">
                {!!price ? (
                  <div>
                    <span className="text-2xl font-bold">${price}</span>
                    <span className="text-muted-foreground text-sm">
                      /{t?.perPerson}
                    </span>
                  </div>
                ) : null}
                <BookingDialog
                  bookingType={bookingType}
                  dialogOptions={{
                    buttonText: t?.reserveButton || "Book now",
                    buttonClassName: "ml-auto",
                    title: t?.reserveButton || "Book now",
                  }}
                  dialogId={dialogId}
                  locale={locale}
                />
              </div>
            </footer>
          </div>
          <RichText body={body} icon={icon} className="mx-0" />
        </section>
      </div>
    </Suspense>
  )
}

export default DetailsPageLayout
