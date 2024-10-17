import Image from "next/image"
import { urlFor } from "@/sanity/lib/image"
import Title from "../../../components/Title"
import { Suspense } from "react"
import Loading from "./loading"
import RichText from "../../../components/RichText"

const PageLayout = async ({
  locale,
  pageName,
  title,
  description,
  mainImage,
  body,
  icon: iconProp,
  ...props
}: {
  locale: string
  pageName: string
  body: any
  icon?: string
  [props: string]: any
}) => {
  if (!pageName) return "loading"

  return (
    <Suspense fallback={<Loading />}>
      <div className="bg-white dark:bg-slate-500">
        <div className="prose w-11/12 lg:prose-lg mx-auto pt-5 lg:pt-12">
          <Title
            titleClassName="text-3xl font-bold my-5"
            iconClassName="fill-guarumo-secondary inline mr-2"
            title={title}
          />
        </div>
        {mainImage && (
          <Image
            src={urlFor(mainImage).width(1600).height(500).url()}
            alt=""
            height={700}
            width={1600}
            className="mb-5"
          />
        )}
        <section className="w-11/12 py-5 lg:py-12 prose lg:prose-lg mx-auto">
          <h4 className="max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            {description}
          </h4>
          <RichText body={body} icon={iconProp} />
        </section>
      </div>
    </Suspense>
  )
}

export default PageLayout
