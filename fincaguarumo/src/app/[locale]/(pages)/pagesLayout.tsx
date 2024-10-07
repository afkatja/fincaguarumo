import Image from "next/image"
import { urlFor } from "@/sanity/lib/image"
import Title from "../../../components/Title"
import { Suspense } from "react"
import { Ellipsis } from "lucide-react"

const PageLayout = async ({
  locale,
  pageName,
  title,
  description,
  mainImage,
  children,
  icon: iconProp,
  ...props
}: {
  locale: string
  pageName: string
  children: React.ReactNode
  icon?: string
  [props: string]: any
}) => {
  if (!pageName) return "loading"

  return (
    <Suspense fallback={<Ellipsis />}>
      <div className="prose prose-lg mx-auto pt-12">
        <Title
          titleClassName="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-5"
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
      <section className="w-11/12 mx-auto py-12">
        <div className="prose prose-lg mx-auto">
          <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            {description}
          </p>
          {children}
        </div>
      </section>
    </Suspense>
  )
}

export default PageLayout
