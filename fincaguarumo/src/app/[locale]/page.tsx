import { SanityImageObject } from "@sanity/image-url/lib/types/types"

import { sanityFetch } from "../../sanity/lib/client"
import {
  FEATURED_POSTS_QUERY,
  FEATURED_TOURS_QUERY,
  HOME_QUERY,
} from "../../sanity/lib/queries"
import TourItem from "./(pages)/tours/TourItem"
import Video from "../../components/Video"
import FeaturedContent from "../../components/FeaturedContent"
import { ArrowDown } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"
import Loading from "./(pages)/loading"
import RichText from "../../components/RichText"

export default async function Home({ params }: { params: any }) {
  const { locale } = await params

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
    isPublished: boolean
  }[] = await sanityFetch({
    query: FEATURED_TOURS_QUERY,
    params: { language: locale },
    revalidate: 0,
  })

  const posts: {
    title: string
    slug: { current: string }
    mainImage?: SanityImageObject & { alt: string }
    isPublished: boolean
  }[] = await sanityFetch({
    query: FEATURED_POSTS_QUERY,
    params: { category: "featured", language: locale },
    revalidate: 0,
  })

  const featuredTours = tours
    .filter(tour => tour.isPublished)
    .map(tour => ({
      ...tour,
      content: (
        <TourItem
          href={`/tours/${tour.slug.current}`}
          mainImage={tour.mainImage}
          title={tour.title}
          isFeatured
          description={tour.description}
          slug={tour.slug}
          isPublished={tour.isPublished}
        />
      ),
    }))
  const featuredPosts = posts
    .filter(post => post.isPublished)
    .map(({ title, mainImage, slug, isPublished, ...post }) => ({
      ...post,
      content: (
        <TourItem
          href={`/blog/${slug.current}`}
          mainImage={mainImage}
          title={title}
          slug={slug}
          isPublished={isPublished}
        />
      ),
    }))

  return (
    <Suspense fallback={<Loading />}>
      <div className="parallax-bg relative">
        <Video
          src="/assets/sunrise.m4v"
          autoPlay
          loop
          muted
          className="object-cover w-full h-full delay-2000 opacity-0 transition-opacity duration-700 animate-fade"
        />
        <div className="hero text-center text-zinc-50 drop-shadow-sharp">
          <h1 className="text-6xl leading-normal font-black opacity-0 transition-opacity duration-700 animate-fade delay-500">
            {content?.hero_title}
          </h1>
          <h2 className="text-3xl mb-5 font-semibold opacity-0 transition-opacity duration-700 delay-700 animate-fade">
            {content?.hero_slogan}
          </h2>
          <h3 className="text-xl leading-normal opacity-0 transition-opacity duration-700 delay-1000 animate-fade">
            {content?.subtitle}
          </h3>
        </div>
        <div className="animate-slide transition-transform duration-1000 delay-1000">
          <Link
            href="#intro"
            className="fade-from-view absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <ArrowDown className="animate-bounce stroke-zinc-50" />
          </Link>
        </div>
      </div>
      <div className="content-wrap">
        <div id="intro" className="prose prose-lg w-11/12 mx-auto">
          {content?.intro_body ? <RichText body={content?.intro_body} /> : null}
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
      </div>
    </Suspense>
  )
}
