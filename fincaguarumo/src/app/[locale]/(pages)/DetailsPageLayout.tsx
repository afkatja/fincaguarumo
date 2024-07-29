import React from "react"
import { ClockIcon, Pin as MapPinIcon } from "@/components/icons"
import BookingDialog from "./Dialog"

const DetailsPageLayout = ({
  title,
  description,
  duration,
  location,
  price,
  slideshow,
}: {
  title: string
  description: string
  duration: string
  location: string
  price: number
  slideshow?: React.ReactNode
}) => {
  return (
    <div className="w-11/12 mx-auto py-8">
      <h1 className="text-3xl font-bold my-5">{title}</h1>
      <div className="relative">{slideshow && slideshow}</div>
      <div className="grid md:grid-cols-2 gap-8 mt-8 md:mt-12">
        <div>
          <p className="text-muted-foreground mt-2">{description}</p>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-1">
              <ClockIcon className="h-5 w-5 text-primary" />
              <span>{duration}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPinIcon className="h-5 w-5 text-primary" />
              <span>{location}</span>
            </div>
          </div>
        </div>
        <footer className="bg-muted rounded-lg p-6 md:p-8">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold">${price}</span>
              <span className="text-muted-foreground text-sm">/person</span>
            </div>
            <BookingDialog
              price={price}
              title="Horse back riding tour"
              description="Reserve now to enjoy the tour"
            />
          </div>
        </footer>
      </div>
    </div>
  )
}

export default DetailsPageLayout
