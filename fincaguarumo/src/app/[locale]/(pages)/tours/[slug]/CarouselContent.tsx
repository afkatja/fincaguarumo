import React from "react"
import Image from "next/image"

import { CarouselContent, CarouselItem } from "@/components/ui/carousel"
import { SanityImageObject } from "@sanity/image-url/lib/types/types"
import { urlFor } from "@/sanity/lib/image"

const CarouselContentContent = ({
  images,
  size,
}: {
  images: SanityImageObject[]
  size: number
}) => {
  return (
    <CarouselContent>
      {images.map(image => (
        <CarouselItem key={crypto.randomUUID()}>
          {image && (
            <Image
              src={urlFor(image).url()}
              alt=""
              className="w-full h-[400px] md:h-[500px] object-cover"
              width={size}
              height={size}
            />
          )}
        </CarouselItem>
      ))}
    </CarouselContent>
  )
}

export default CarouselContentContent
