"use client"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  CarouselDot,
} from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"
import Image from "next/image"
import { Source } from "./Source"

const ImgSlider = ({
  images,
  useArrows,
  options,
  ...props
}: {
  images: {
    desktop: string
    tablet: string
    mobile: string
    src: string
    alt: string
    width?: number
    height?: number
  }[]
  useArrows?: boolean
  options?: any
  [prop: string]: any
}) => {
  return (
    <Carousel
      {...props}
      plugins={[Autoplay({})]}
      className={`w-11/12 mx-auto ${props.className}`}
    >
      <CarouselContent>
        {images.map((img, i) => (
          <CarouselItem key={i}>
            <picture>
              <Source media="(min-width: 1024px)" src={img.desktop} />
              <Source media="(min-width: 768px)" src={img.tablet} />
              <Source media="(min-width: 640px)" src={img.mobile} />
              <Image
                src={img.src}
                sizes="10vw"
                // layout="fill"
                alt={img.alt}
                width={img.width ?? 2016}
                height={img.height ?? 1134}
                className="mx-auto h-full object-cover"
              />
            </picture>
          </CarouselItem>
        ))}
      </CarouselContent>
      {useArrows ? (
        <>
          <CarouselPrevious />
          <CarouselNext />
        </>
      ) : (
        <CarouselDot />
      )}
    </Carousel>
  )
}

export default ImgSlider
