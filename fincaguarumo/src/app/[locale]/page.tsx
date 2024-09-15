import { SanityImageObject } from "@sanity/image-url/lib/types/types"
import { urlFor } from "@/sanity/lib/image"

import { sanityFetch } from "../../sanity/lib/client"
import {
  FEATURED_POSTS_QUERY,
  FEATURED_TOURS_QUERY,
  HOME_QUERY,
} from "../../sanity/lib/queries"
import Carousel from "@/components/Carousel"
import Image from "next/image"
import TourItem from "./(pages)/tours/TourItem"
import Video from "../../components/Video"

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
    params: {},
    revalidate: 0,
  })

  const featuredPosts: {
    title: string
    slug: { current: string }
    mainImage?: SanityImageObject
  }[] = await sanityFetch({
    query: FEATURED_POSTS_QUERY,
    params: { category: "featured" },
    revalidate: 0,
  })

  return (
    <>
      <div className="parallax-bg relative">
        <Video src="/assets/sunrise.m4v" autoPlay loop muted />
        <div className="hero text-center text-white drop-shadow-sharp">
          <h1 className="text-6xl leading-normal font-black">
            {content?.hero_title}
          </h1>
          <h2 className="text-3xl mb-5 font-semibold">
            {content?.hero_slogan}
          </h2>
          <h3 className="text-xl leading-normal">{content?.subtitle}</h3>
        </div>
      </div>
      <article className="featured-activities relative z-10 bg-white">
        <div className="w-11/12 mx-auto py-5">
          {content?.featured_content_title && (
            <h1 className="text-3xl mt-5">{content?.featured_content_title}</h1>
          )}
          <ul className="tours-featured flex flex-wrap gap-2 -mx-10">
            {tours.map(tour => (
              <li
                key={crypto.randomUUID()}
                className="tour-featured flex-1 m-10"
              >
                <TourItem
                  mainImage={tour.mainImage}
                  title={tour.title}
                  isFeatured
                  description={tour.description}
                  slug={tour.slug}
                />
              </li>
            ))}
          </ul>
        </div>
      </article>
      {featuredPosts && (
        <article className="featured-posts bg-white">
          <div className="w-11/12 mx-auto p5">
            {content?.featured_blog_title && (
              <h1 className="text-3xl mt-5">{content?.featured_blog_title}</h1>
            )}
            <ul className="posts-featured flex flex-wrap gap-2 -mx-10">
              {featuredPosts.map(post => (
                <li
                  key={crypto.randomUUID()}
                  className="tour-featured flex-1 m-10"
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
                </li>
              ))}
            </ul>
          </div>
        </article>
      )}
      {/* <Carousel /> */}
    </>
  )
}
