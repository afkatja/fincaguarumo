import Image from "next/image"
import { urlFor } from "@/sanity/lib/image"
import Icon from "../../../components/Icon"

const PageLayout = async ({
  locale,
  pageName,
  title,
  description,
  mainImage,
  children,
  ...props
}: {
  locale: string
  pageName: string
  children: React.ReactNode
  [props: string]: any
}) => {
  if (!pageName) return "loading"

  return (
    <section className="w-11/12 mx-auto py-12">
      {mainImage && (
        <Image
          src={urlFor(mainImage).width(1600).height(700).url()}
          alt=""
          height={700}
          width={1600}
        />
      )}
      <div className="prose prose-lg mx-auto">
        <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
          <Icon
            icon="Aracari"
            size={40}
            className="fill-guarumo-secondary inline mr-2"
          />
          {title}
        </h2>
        <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
          {description}
        </p>
        {children}
      </div>
    </section>
  )
}

export default PageLayout
