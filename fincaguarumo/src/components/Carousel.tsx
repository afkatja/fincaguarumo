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

const ImgSlider = ({
  images,
  useArrows,
  options,
  ...props
}: {
  images: { src: string; alt: string }[]
  useArrows?: boolean
  options?: any
  [prop: string]: any
}) => {
  return (
    <Carousel
      plugins={[Autoplay({})]}
      className={`w-11/12 h-[100vh] mx-auto carousel ${props.className}`}
      {...props}
    >
      <CarouselContent>
        {images.map((img, i) => (
          <CarouselItem key={i}>
            <Image
              src={img.src}
              alt={img.alt}
              width={2016}
              height={1134}
              className="w-full h-full object-cover"
            />
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
