import { createClient, QueryOptions, QueryParams } from "next-sanity"
import { draftMode } from "next/headers"
import { apiVersion, dataset, projectId } from "../env"
import { token } from "./token"

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true, // Set to false if statically generating pages, using ISR or tag-based revalidation
  stega: {
    enabled: process.env.NEXT_PUBLIC_VERCEL_ENV === "preview",
    studioUrl: "/studio",
  },
})

export async function sanityFetch<QueryResponse>({
  query,
  params = {},
  revalidate = 60,
  tags = [],
}: {
  query: string
  params?: QueryParams
  revalidate?: number | false
  tags?: string[]
}) {
  const draft = await draftMode()
  const isDraftMode = draft.isEnabled
  if (isDraftMode && !token) {
    throw new Error("Missing environment variable SANITY_API_READ_TOKEN")
  }

  let dynamicRevalidate = revalidate
  if (isDraftMode) {
    // Do not cache in Draft Mode
    dynamicRevalidate = 0
  } else if (tags.length) {
    // Cache indefinitely if tags supplied, purge with revalidateTag()
    dynamicRevalidate = false
  }

  return client.fetch<QueryResponse>(query, params, {
    ...(isDraftMode &&
      ({
        token: token,
        perspective: "previewDrafts",
        stega: true,
        cache: "no-store",
      } satisfies QueryOptions)),
    next: {
      revalidate: 0, //dynamicRevalidate,
      tags,
    },
  })
}
