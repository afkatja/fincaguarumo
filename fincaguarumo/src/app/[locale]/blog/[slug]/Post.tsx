import Image from "next/image"

import { urlFor } from "@/sanity/lib/image"

import { POST_QUERYResult } from "../../../../../sanity.types"
import Breadcrumbs from "../../../../components/Breadcrumbs"
import Title from "../../../../components/Title"
import RichText from "../../../../components/RichText"
import PagesLayout from "../../(pages)/pagesLayout"

export function Post({
  post,
  parent,
  locale,
}: {
  post: POST_QUERYResult
  parent: { title: string; href: string }
  locale: string
}) {
  const { title, mainImage, body, slug } = post || {}

  return (
    <PagesLayout
      locale={locale}
      pageName={slug?.current as string}
      title={title}
      mainImage={mainImage}
    >
      {parent && (
        <Breadcrumbs
          className="max-w-[60rem] mx-auto"
          title={title as string}
          parent={parent}
        />
      )}

      {body ? <RichText body={body} /> : null}
    </PagesLayout>
  )
}
