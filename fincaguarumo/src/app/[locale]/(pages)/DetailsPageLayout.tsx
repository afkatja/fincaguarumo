import React, { Suspense } from "react"

import BookingDialog from "./Dialog"

import Icon from "@/components/Icon"
import { TTour } from "./tours/data"
import Breadcrumbs from "../../../components/Breadcrumbs"
import Title from "../../../components/Title"
import { Ellipsis } from "lucide-react"
import { PortableText } from "next-sanity"

const DetailsPageLayout = ({
  title,
  description,
  duration,
  location,
  price,
  slideshow,
  parent,
  body,
}: Omit<TTour, "images"> & {
  slideshow?: React.ReactNode
  parent?: { title: string; href: string }
}) => {
  return (
    <Suspense fallback={<Ellipsis />}>
      <div className="w-11/12 mx-auto pt-8">
        {parent && <Breadcrumbs title={title} parent={parent} />}
        <Title
          title={title}
          titleClassName="text-3xl font-bold my-5"
          iconClassName="fill-guarumo-secondary inline mr-2"
        />
      </div>
      <div className="relative">{slideshow && slideshow}</div>
      <div className="w-11/12 mx-auto py-8">
        <div className="grid md:grid-cols-2 gap-8 mt-8 md:mt-12">
          <div>
            <p className="text-muted-foreground mt-2">{description}</p>
            <div className="flex items-center gap-4 mt-4">
              {duration && (
                <div className="flex items-center gap-1">
                  <Icon icon="Clock" className="h-5 w-5 text-primary" />
                  <span>{duration}</span>
                </div>
              )}
              {location && (
                <div className="flex items-center gap-1">
                  <Icon icon="Pin" className="h-5 w-5 text-primary" />
                  <span>{location}</span>
                </div>
              )}
            </div>
          </div>
          <footer className="bg-muted rounded-lg p-6 md:p-8">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold">${price}</span>
                <span className="text-muted-foreground text-sm">/person</span>
              </div>
              <BookingDialog
                price={Number(price)}
                title={title}
                description={description}
              />
            </div>
          </footer>
        </div>
        {body && (
          <div className="prose prose-lg mt-5">
            <PortableText value={body} />
          </div>
        )}
      </div>
    </Suspense>
  )
}

export default DetailsPageLayout
