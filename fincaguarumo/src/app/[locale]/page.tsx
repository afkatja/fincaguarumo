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
import { PortableText } from "next-sanity"
import { ArrowDown } from "lucide-react"
import Link from "next/link"

export default async function Home({
  params: { locale },
}: {
  params: { locale: string }
}) {
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
    mainImage?: SanityImageObject
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
  const featuredPosts = posts.map(post => ({
    ...post,
    content: (
      <Link
        href={`/blog/${post.slug.current}`}
        className="group tour no-underline"
        prefetch
      >
        {post.mainImage && (
          <Image
            src={urlFor(post.mainImage).width(300).height(300).url()}
            width={300}
            height={300}
            alt=""
          />
        )}
        <h1 className="my-3">{post.title}</h1>
      </Link>
    ),
  }))

  return (
    <>
      <div className="parallax-bg relative">
        <Video
          src="/assets/sunrise.m4v"
          autoPlay
          loop
          muted
          className="object-cover w-full h-full"
        />
        <div className="hero text-center text-white drop-shadow-sharp">
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
          <ArrowDown className="animate-bounce stroke-white " />
        </Link>
      </div>
      <div className="bg-white py-5" id="intro">
        <div className="prose prose-lg w-11/12 mx-auto">
          {content?.intro_body ? (
            <PortableText value={content?.intro_body} />
          ) : null}
        </div>
      </div>

      <FeaturedContent
        featuredContentTitle={content?.featured_content_title}
        items={featuredTours}
      />
      {featuredPosts && (
        <FeaturedContent
          featuredContentTitle={content?.featured_blog_title}
          items={featuredPosts}
        />
      )}
    </>
  )
}
