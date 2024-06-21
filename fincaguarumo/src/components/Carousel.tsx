import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel"
import Image from "next/image"
import { useId } from "react"

const images = [
  { src: "https://picsum.photos/1920/1080?random=1", alt: "" },
  { src: "https://picsum.photos/1920/1080?random=2", alt: "" },
  { src: "https://picsum.photos/1920/1080?random=3", alt: "" },
]

const ImgSlider = () => {
  const id = useId()
  return (
    <Carousel className="w-full h-[80vh]">
      <CarouselContent>
        {images.map(img => (
          <CarouselItem key={id}>
            <Image
              src={img.src}
              alt={img.alt}
              width={1920}
              height={1080}
              className="w-full h-full object-cover"
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  )
}

export default ImgSlider
