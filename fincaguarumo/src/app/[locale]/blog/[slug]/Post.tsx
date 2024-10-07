import Image from "next/image"
import { PortableText } from "@portabletext/react"

import { urlFor } from "@/sanity/lib/image"

import { POST_QUERYResult } from "../../../../../sanity.types"
import Breadcrumbs from "../../../../components/Breadcrumbs"

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
        <div className="prose prose-lg mx-auto">
          <Breadcrumbs title={title as string} parent={parent} />
        </div>
      )}
      <article className="prose prose-lg p-4 mx-auto">
        {title ? <h1>{title}</h1> : null}
        {mainImage?.asset?._ref ? (
          <Image
            className="float-left m-0 w-1/3 mr-4 rounded-lg"
            src={urlFor(mainImage?.asset?._ref).width(300).height(300).url()}
            width={300}
            height={300}
            alt={title || ""}
          />
        ) : null}
        {body ? <PortableText value={body} /> : null}
      </article>
    </div>
  )
}
