import { Suspense } from "react"

import { notFound } from "next/navigation"
import Title from "@/components/Title"
import Loading from "./loading"
import RichText from "@/components/RichText"
import Slideshow from "@/components/Slideshow"
import { shuffle } from "@/lib/utils"
import type { SanityImageObject } from "@sanity/image-url/lib/types/types"

const PageLayout = ({
  pageName,
  title,
  subtitle,
  description,
  mainImage,
  body,
  icon: iconProp,
  children,
  images,
  // ...props
}: {
  subtitle?: string
  pageName: string
  body?: any
  icon?: string
  children?: React.ReactNode
  images?: any[]
  [props: string]: any
}) => {
  if (!pageName) notFound()

  return (
    <Suspense fallback={<Loading />}>
      <div className="bg-zinc-50 dark:bg-zinc-900 pt-5 lg:pt-8 content-wrap z-10 flex-1">
        <div className="prose w-11/12 lg:prose-lg mx-auto relative z-20">
          <Title
            titleClassName="text-5xl font-bold mb-5 lg:mb-8 text-guarumo-accent dark:text-zinc-50"
            icon={{
              iconClassName: "fill-guarumo-accent dark:fill-zinc-50",
            }}
            title={title}
            Heading="h1"
          />
          {subtitle && (
            <Title
              titleClassName="text-3xl font-bold my-3 text-guarumo-primary dark:text-zinc-50"
              title={subtitle}
              Heading="h2"
            />
          )}
        </div>
        {(mainImage || images) && (
          <Slideshow
            images={
              images
                ? (shuffle(images) as unknown as SanityImageObject[])
                : [mainImage]
            }
          />
        )}
        <section className="!w-11/12 !pt-6 lg:py-2 prose lg:prose-lg mx-auto">
          <h3 className="text-guarumo-primary dark:text-zinc-50">
            {description}
          </h3>
        </section>
        {body && <RichText body={body} icon={iconProp} />}
        {children}
      </div>
    </Suspense>
  )
}

export default PageLayout
