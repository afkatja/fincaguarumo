import React from "react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ExpandIcon } from "@/components/icons"

const Slideshow = () => {
  return (
    <>
      <Carousel autoPlay interval={5000} className="rounded-lg overflow-hidden">
        <CarouselContent>
          <CarouselItem>
            <Image
              src="/images/placeholder.svg"
              alt="Activity Image"
              className="w-full h-[400px] md:h-[500px] object-cover"
              width={1920}
              height={1080}
            />
          </CarouselItem>
          <CarouselItem>
            <Image
              src="/images/placeholder.svg"
              alt="Activity Image"
              className="w-full h-[400px] md:h-[500px] object-cover"
              width={1920}
              height={1080}
            />
          </CarouselItem>
          <CarouselItem>
            <Image
              src="/images/placeholder.svg"
              alt="Activity Image"
              className="w-full h-[400px] md:h-[500px] object-cover"
              width={1920}
              height={1080}
            />
          </CarouselItem>
        </CarouselContent>
      </Carousel>
      <Button
        variant="outline"
        size="sm"
        className="absolute top-4 right-4 bg-background/50 hover:bg-background"
      >
        <ExpandIcon className="h-5 w-5" />
        <span className="sr-only">Expand</span>
      </Button>
    </>
  )
}

export default Slideshow
