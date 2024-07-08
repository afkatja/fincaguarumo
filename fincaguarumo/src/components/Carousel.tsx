import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel"
import { randomUUID } from "crypto"
import Image from "next/image"

const images = [
  { src: "/images/finca-guarumo.jpg", alt: "Finca Guarumo" },
  { src: "https://picsum.photos/1920/1080?random=2", alt: "" },
  { src: "https://picsum.photos/1920/1080?random=3", alt: "" },
]

const ImgSlider = () => {
  return (
    <Carousel className="w-full h-[100vh]">
      <CarouselContent>
        {images.map(img => (
          <CarouselItem key={randomUUID()}>
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
