"use client"
import React from "react"
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

const ImgSlider = React.memo(
  ({
    images,
    useArrows,
    options,
    className = "",
    ...props
  }: {
    images: {
      desktop?: string
      tablet?: string
      mobile?: string
      src: string
      alt: string
      width?: number
      height?: number
    }[]
    useArrows?: boolean
    options?: any
    className?: string
    [prop: string]: any
  }) => {
    return (
      <Carousel
        {...props}
        plugins={[Autoplay({})]}
        className={`w-11/12 mx-auto md:max-h-[70dvh] flex flex-col ${className}`}
      >
        <CarouselContent>
          {images.slice(0, 12).map((img, i) => (
            <CarouselItem key={i}>
              <Image
                src={img.src}
                sizes="(max-width: 640px) 640px, (max-width: 1024px) 1024px, 2016px"
                alt={img.alt}
                width={img.width ?? 2016}
                height={img.height ?? 1134}
                className="mx-auto object-cover"
                priority={i === 0}
                quality={100}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        {useArrows ? (
          <>
            <CarouselPrevious />
            <CarouselNext />
          </>
        ) : images.length > 1 ? (
          <CarouselDot />
        ) : null}
      </Carousel>
    )
  }
)

ImgSlider.displayName = "ImgSlider"

export default ImgSlider
