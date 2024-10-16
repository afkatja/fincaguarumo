import React, { Suspense, useState } from "react"
import { SanityImageObject } from "@sanity/image-url/lib/types/types"
import Carousel from "@/components/Carousel"
import { Button } from "@/components/ui/button"
import Icon from "@/components/Icon"
import Loading from "../../loading"
import { urlFor } from "../../../../../sanity/lib/image"

const Slideshow = ({ images: imagesProp }: { images: SanityImageObject[] }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const images = imagesProp.map(img => ({
    src: urlFor(img).height(700).width(1200).url(),
    alt: "",
    height: 700,
    width: 1200,
  }))

  return (
    <Suspense fallback={<Loading />}>
      <Carousel images={images} useArrows={false} className="overflow-hidden" />
      <Button
        variant="outline"
        size="sm"
        className="absolute top-4 right-4 bg-background/50 hover:bg-background"
        onClick={() => setIsExpanded(true)}
      >
        <Icon icon="Expand" className="h-5 w-5" />
        <span className="sr-only">Expand</span>
      </Button>

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
