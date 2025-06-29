import { createClient, QueryParams } from "next-sanity"
import { apiVersion, dataset, projectId } from "../env"

// Client-side only Sanity client (no server-side features)
export const clientSideClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  stega: {
    enabled: process.env.NEXT_PUBLIC_VERCEL_ENV === "preview",
    studioUrl: "/studio",
  },
})

export const clientSideFetch = async (query: string, params?: QueryParams) =>
  await clientSideClient.fetch(query, params)
