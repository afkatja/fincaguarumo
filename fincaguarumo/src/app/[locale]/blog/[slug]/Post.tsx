import Image from "next/image"
import { PortableText } from "@portabletext/react"

import { urlFor } from "@/sanity/lib/image"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { POST_QUERYResult } from "../../../../../sanity.types"

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
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href={`/${parent.href}`}>
                  {parent.title}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
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
