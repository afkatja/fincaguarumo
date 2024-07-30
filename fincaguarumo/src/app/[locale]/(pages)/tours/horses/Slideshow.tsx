import React, { useState } from "react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Close, ExpandIcon } from "@/components/icons"
import Autoplay from "embla-carousel-autoplay"
import tours from "../data"

const Slideshow = () => {
  const images = tours.filter(tour => tour.title.includes("horse"))[0].images

  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <>
      <Carousel
        // @ts-ignore
        plugins={[Autoplay({})]}
        interval={5000}
        className="rounded-lg overflow-hidden"
      >
        <CarouselContent>
          {images.map(image => (
            <CarouselItem key={crypto.randomUUID()}>
              <Image
                src={image.src}
                alt={image.alt}
                className="w-full h-[400px] md:h-[500px] object-cover"
                width={image.width}
                height={image.height}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <Button
        variant="outline"
        size="sm"
        className="absolute top-4 right-4 bg-background/50 hover:bg-background"
        onClick={() => setIsExpanded(true)}
      >
        <ExpandIcon className="h-5 w-5" />
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
              <Close className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
            <Carousel
              // @ts-ignore
              plugins={[Autoplay({})]}
              interval={5000}
              className="rounded-lg overflow-hidden"
            >
              <CarouselContent>
                {images.map(image => (
                  <CarouselItem key={crypto.randomUUID()}>
                    <Image
                      src={image.src}
                      alt={image.alt}
                      className="w-full h-[400px] md:h-[500px] object-cover"
                      width={image.width}
                      height={image.height}
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        </div>
      )}
    </>
  )
}

export default Slideshow
