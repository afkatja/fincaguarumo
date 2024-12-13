import Image from "next/image"

import { urlFor } from "@/sanity/lib/image"

import { POST_QUERYResult } from "../../../../../sanity.types"
import Breadcrumbs from "../../../../components/Breadcrumbs"
import Title from "../../../../components/Title"
import RichText from "../../../../components/RichText"

export function Post({
  post,
  parent,
}: {
  post: POST_QUERYResult
  parent: { title: string; href: string }
}) {
  const { title, mainImage, body } = post || {}

  return (
    <div className="w-11/12 mx-auto py-8">
      {parent && (
        <Breadcrumbs
          className="max-w-[60rem] mx-auto"
          title={title as string}
          parent={parent}
        />
      )}
      <article className="prose prose-lg dark:prose-invert py-4 mx-auto">
        {title ? <Title title={title} Heading="h1" /> : null}
        {mainImage?.asset?._ref ? (
          <Image
            className="float-left m-0 w-1/3 mr-4 rounded-lg"
            src={urlFor(mainImage?.asset?._ref).width(300).height(300).url()}
            width={300}
            height={300}
            alt={title || ""}
          />
        ) : null}
        {body ? <RichText body={body} /> : null}
      </article>
    </div>
  )
}
