import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import Badge from "@/components/badge"
import Icon from "../../../../components/Icon"
import { SanityImageObject } from "@sanity/image-url/lib/types/types"
import { urlFor } from "@/sanity/lib/image"

export type TourType = {
  title: string
  description?: string
  mainImage?: SanityImageObject & { alt: string }
  slug: { current: string }
  dateAdded?: string
  isNew?: boolean
  isFeatured?: boolean
}

const TourItem = ({
  title,
  description,
  mainImage,
  slug,
  dateAdded,
  isNew,
  isFeatured,
}: TourType) => {
  return (
    <Link
      href={`/tours/${slug.current}`}
      className="group tour no-underline"
      prefetch={false}
    >
      <Card className="h-full overflow-hidden rounded-xl bg-muted shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <CardContent className="flex h-full flex-col justify-between p-6">
          <div className="relative">
            {isNew && <Badge text="New" />}
            {isFeatured && <Badge text="Featured" />}
            {mainImage && (
              <Image
                src={urlFor(mainImage).url()}
                alt={mainImage.alt}
                width={800}
                height={800}
                className="mt-0 mb-3 max-h-52 object-cover"
              />
            )}
            <h3 className="text-xl font-semibold">{title}</h3>
            <p className="mt-2 text-muted-foreground">{description}</p>
          </div>
          <div className="mt-4 flex items-center justify-between">
            {dateAdded && (
              <div className="flex items-center gap-2 text-sm font-medium">
                <Icon icon="Calendar" className="h-4 w-4" />
                <span>{dateAdded}</span>
              </div>
            )}
          </div>
          <p className="flex w-full group-hover:underline mt-3">
            Read more{" "}
            <Icon
              icon="ArrowRight"
              className="ml-auto h-5 w-5 text-muted-foreground transition-all group-hover:translate-x-1"
            />
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}

export default TourItem
