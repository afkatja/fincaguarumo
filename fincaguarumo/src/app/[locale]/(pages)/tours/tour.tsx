/**
 * v0 by Vercel.
 * @see https://v0.dev/t/AkcBESAWecW
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarIcon, ArrowRightIcon } from "@/components/icons"
import Image from "next/image"
import Badge from "@/components/badge"

export default function Tour({
  title,
  description,
  images,
  url,
  dateAdded,
  isNew,
  isFeatured,
}: {
  title: string
  description: string
  images: { src: string; alt: string; width: number; height: number }[]
  url: string
  dateAdded?: string
  isNew?: boolean
  isFeatured?: boolean
}) {
  return (
    <Link href={url} className="group tour" prefetch={false}>
      <Card className="h-full overflow-hidden rounded-xl bg-muted shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <CardContent className="flex h-full flex-col justify-between p-6">
          <div className="relative">
            {isNew && <Badge text="New" />}
            {isFeatured && <Badge text="Featured" />}
            <Image
              src={images[0].src}
              alt={images[0].alt}
              width={images[0].width}
              height={images[0].height}
              className="mb-3 max-h-52 object-cover"
            />
            <h3 className="text-xl font-semibold ">{title}</h3>
            <p className="mt-2 text-muted-foreground">{description}</p>
          </div>
          <div className="mt-4 flex items-center justify-between">
            {dateAdded && (
              <div className="flex items-center gap-2 text-sm font-medium">
                <CalendarIcon className="h-4 w-4" />
                <span>{dateAdded}</span>
              </div>
            )}
          </div>
          <p className="flex w-full group-hover:underline mt-3">
            Read more{" "}
            <ArrowRightIcon className="ml-auto h-5 w-5 text-muted-foreground transition-all group-hover:translate-x-1" />
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
