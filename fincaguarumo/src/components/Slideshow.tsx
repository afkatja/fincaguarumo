"use client"
import React, { Suspense, useState } from "react"
import { SanityImageObject } from "@sanity/image-url/lib/types/types"
import Carousel from "@/components/Carousel"
import { Button } from "@/components/ui/button"
import Icon from "@/components/Icon"
import Loading from "../app/[locale]/(pages)/loading"
import { urlFor } from "../sanity/lib/image"

const Slideshow = ({
  images: imagesProp,
  showExpand,
}: {
  images: SanityImageObject[]
  showExpand?: boolean
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const images = imagesProp.map(img => ({
    src: urlFor(img)
      .width(2016)
      .height(1134)
      .fit("crop")
      .quality(100)
      .format("webp")
      .url(),
    alt: "",
    width: 2016,
    height: 1134,
  }))

  return (
    <Suspense fallback={<Loading />}>
      <div className="relative">
        <Carousel
          images={images}
          useArrows={false}
          className="overflow-hidden"
        />
        {showExpand && (
          <Button
            variant="outline"
            size="sm"
            className="absolute top-4 right-8 md:right-16 bg-background/50 hover:bg-background dark:bg-transparent dark:hover:bg-zinc-700 z-50 drop-shadow-md"
            onClick={() => setIsExpanded(true)}
          >
            <Icon icon="Expand" className="h-5 w-5 dark:stroke-zinc-50" />
            <span className="sr-only">Expand</span>
          </Button>
        )}
      </div>

      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="relative w-full max-w-6xl max-h-[90vh] overflow-auto">
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-4 bg-background/50 hover:bg-background z-10"
              onClick={() => setIsExpanded(false)}
            >
              <Icon icon="Close" className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
            <Carousel
              images={images}
              useArrows={false}
              className="overflow-hidden carousel pt-14"
            />
          </div>
        </div>
      )}
    </Suspense>
  )
}

export default Slideshow
