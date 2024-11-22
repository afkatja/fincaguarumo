import { SanityImageObject } from "@sanity/image-url/lib/types/types"
import { urlFor } from "@/sanity/lib/image"

import { sanityFetch } from "../../sanity/lib/client"
import {
  FEATURED_POSTS_QUERY,
  FEATURED_TOURS_QUERY,
  HOME_QUERY,
} from "../../sanity/lib/queries"
// import Carousel from "@/components/Carousel"
import Image from "next/image"
import TourItem from "./(pages)/tours/TourItem"
import Video from "../../components/Video"
import FeaturedContent from "../../components/FeaturedContent"
import { ArrowDown } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"
import Loading from "./(pages)/loading"
import RichText from "../../components/RichText"

export default async function Home({
  params,
}: {
  params: { locale: string }
}) {
  const {locale} = await params
  const content: {
    hero_title: string
    hero_slogan: string
    subtitle?: string
    featured_content_title?: string
    featured_blog_title?: string
    intro_body?: any
  } = await sanityFetch({
    query: HOME_QUERY,
    params: { language: locale },
    revalidate: 0,
  })

  const tours: {
    title: string
    description?: string
    mainImage?: SanityImageObject & { alt: string }
    slug: { current: string }
  }[] = await sanityFetch({
    query: FEATURED_TOURS_QUERY,
    params: { language: locale },
    revalidate: 0,
  })

  const posts: {
    title: string
    slug: { current: string }
    mainImage?: SanityImageObject & { alt: string }
  }[] = await sanityFetch({
    query: FEATURED_POSTS_QUERY,
    params: { category: "featured", language: locale },
    revalidate: 0,
  })

  const featuredTours = tours.map(tour => ({
    ...tour,
    content: (
      <TourItem
        mainImage={tour.mainImage}
        title={tour.title}
        isFeatured
        description={tour.description}
        slug={tour.slug}
      />
    ),
  }))
  const featuredPosts = posts.map(({ title, mainImage, slug, ...post }) => ({
    ...post,
    content: <TourItem mainImage={mainImage} title={title} slug={slug} />,
  }))

  return (
    <Suspense fallback={<Loading />}>
      <div className="parallax-bg relative">
        <Video
          src="/assets/sunrise.m4v"
          autoPlay
          loop
          muted
          className="object-cover w-full h-full"
        />
        <div className="hero text-center text-zinc-50 drop-shadow-sharp">
          <h1 className="text-6xl leading-normal font-black">
            {content?.hero_title}
          </h1>
          <h2 className="text-3xl mb-5 font-semibold">
            {content?.hero_slogan}
          </h2>
          <h3 className="text-xl leading-normal">{content?.subtitle}</h3>
        </div>
        <Link
          href="#intro"
          className="fade-from-view absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <ArrowDown className="animate-bounce stroke-zinc-50 " />
        </Link>
      </div>
      <div className="content-wrap" id="intro">
        <div className="prose prose-lg w-11/12 mx-auto">
          {content?.intro_body ? <RichText body={content?.intro_body} /> : null}
        </div>
      </div>

      <FeaturedContent
        href="tours"
        featuredContentTitle={content?.featured_content_title}
        items={featuredTours}
      />
      {featuredPosts && (
        <FeaturedContent
          href="blog"
          featuredContentTitle={content?.featured_blog_title}
          items={featuredPosts}
        />
      )}
    </Suspense>
  )
}
