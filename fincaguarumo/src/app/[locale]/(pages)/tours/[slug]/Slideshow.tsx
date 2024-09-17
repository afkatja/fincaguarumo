import React, { useState } from "react"
import { SanityImageObject } from "@sanity/image-url/lib/types/types"
import { Carousel } from "@/components/ui/carousel"
import { Button } from "@/components/ui/button"
import Autoplay from "embla-carousel-autoplay"
import Icon from "@/components/Icon"
import CarouselContent from "./CarouselContent"

const Slideshow = ({ images }: { images: SanityImageObject[] }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <>
      <Carousel
        plugins={[Autoplay({})]}
        // interval={5000}
        className="overflow-hidden"
      >
        <CarouselContent images={images} size={1200} />
      </Carousel>
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
              className="absolute top-4 right-4 bg-background/50 hover:bg-background z-10"
              onClick={() => setIsExpanded(false)}
            >
              <Icon icon="Close" className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
            <Carousel
              plugins={[Autoplay({})]}
              // interval={5000}
              className="overflow-hidden"
            >
              <CarouselContent images={images} size={1200} />
            </Carousel>
          </div>
        </div>
      )}
    </>
  )
}

export default Slideshow
