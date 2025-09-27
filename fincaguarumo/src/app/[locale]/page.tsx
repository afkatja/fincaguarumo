import React from "react"
import { sanityFetch } from "../../sanity/lib/client"
import { HOME_QUERY } from "../../sanity/lib/queries"
import HomePage from "./HomePage"

export default async function Home({ params }: { params: any }) {
  const { locale } = await params

  const content: {
    hero_title: string
    hero_slogan: string
    hero_body?: any
    subtitle?: string
    featured_content_title?: string
    featured_blog_title?: string
    intro_body?: any
    mediaUrl?: { url: string }
    mediaPoster?: { url: string; metadata?: { lqip?: string } }
  } = await sanityFetch({
    query: HOME_QUERY,
    params: { language: locale },
    revalidate: 60,
  })

  return <HomePage locale={locale} content={content} />
}
