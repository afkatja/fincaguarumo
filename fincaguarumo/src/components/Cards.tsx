import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import ArrowIcon from "./icons/ArrowIcon"

const Cards = () => {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardContent className="grid gap-4">
          <Image
            src="/placeholder.svg"
            alt="Retreat 1"
            width={400}
            height={300}
            className="aspect-[4/3] object-cover rounded-md"
          />
          <div className="grid gap-2">
            <h3 className="text-xl font-semibold">Mountain Retreat</h3>
            <p className="text-muted-foreground">
              Escape to our serene mountain retreat, where you can immerse
              yourself in nature and rejuvenate your mind and body.
            </p>
            <Link
              href="#"
              className="inline-flex items-center gap-2 font-medium hover:underline"
              prefetch={false}
            >
              Explore Tours
              <ArrowIcon className="w-4 h-4" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Cards
