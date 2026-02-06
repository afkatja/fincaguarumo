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
import { ImageWithFallback } from "./ImageWithFallback"
import { TImage } from "./ImageWithArtDirection"
import type { CarouselImage } from "@/lib/sanityImages"

const SIZES = "(max-width: 640px) 640px, (max-width: 1024px) 1024px, 2016px"

const CarouselImageEl = ({
  img,
  priority,
}: {
  img: TImage
  priority: boolean
}) => {
  const width = img.width ?? 2016
  const height = img.height ?? 1134
  const fallbackSrc = img.desktop || img.src

  return (
    <ImageWithFallback
      src={fallbackSrc}
      alt={img.alt}
      className="mx-auto w-full object-cover"
      sizes={SIZES}
      priority={priority}
      width={width}
      height={height}
      fill={false}
      mobile={img.mobile}
      tablet={img.tablet}
      desktop={img.desktop}
      blurDataURL={img.metadata?.lqip}
    />
  )
}

const ImgSlider = React.memo(
  ({
    images,
    useArrows,
    options,
    className = "",
    plugins,
    ...props
  }: {
    images: CarouselImage[]
    useArrows?: boolean
    options?: any
    plugins?: any[]
    className?: string
    [prop: string]: any
  }) => {
    const autoplayRef = React.useRef(Autoplay(options ?? {}))

    return (
      <Carousel
        {...props}
        opts={options ?? (props as any).opts}
        plugins={[autoplayRef.current, ...(plugins ?? [])]}
        className={`w-11/12 mx-auto md:max-h-[90dvh] flex flex-col ${className}`}
      >
        <CarouselContent>
          {images.slice(0, 12).map((img, i) => (
            <CarouselItem key={i}>
              <CarouselImageEl img={img} priority={i === 0} />
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
  },
)

ImgSlider.displayName = "ImgSlider"

export default ImgSlider
