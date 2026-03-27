"use client"
import React, { Suspense } from "react"
import dynamic from "next/dynamic"
import { ArrowDown } from "lucide-react"
import Link from "next/link"
import Video from "../../components/Video"
import FadeInObserver from "../../components/FadeInObserver"
import RichText from "../../components/RichText"
import FeaturedContentLoader from "./FeaturedContentLoader"
import LazyLoad from "../../components/LazyLoad"
import Loading from "./(pages)/loading"

const HomeMap = dynamic(() => import("../../components/HomeMap"), {
  ssr: false,
  loading: () => null,
})

const VideoOpenZip = dynamic(() => import("../../components/VideoOpenZip"))

const HomePage = ({ locale, content }: { locale: string; content: any }) => {
  return (
    <>
      <VideoOpenZip>
        <div className="parallax-bg relative w-full h-screen">
          {content?.mediaUrl && (
            <Suspense fallback={<Loading />}>
              <Video
                src={content?.mediaUrl?.url}
                autoPlay
                loop
                muted
                playsInline
                poster={`${content?.mediaPoster?.url}?auto=format`}
                placeholder="blur"
                blurDataURL={content?.mediaPoster?.metadata?.lqip}
                className="object-cover w-full h-full transition-opacity duration-1000"
                critical
              />
            </Suspense>
          )}
          <div className="hero text-center text-zinc-50 drop-shadow-sharp">
            <h1 className="text-6xl leading-normal font-black opacity-0 transition-opacity animation-duration-500 animate-fade animation-delay-2500">
              {content?.hero_title}
            </h1>
            <h2 className="text-3xl mb-5 font-semibold opacity-0 transition-opacity animation-duration-700 animation-delay-2700 animate-fade">
              {content?.hero_slogan}
            </h2>
            <h3 className="text-xl leading-normal opacity-0 transition-opacity animation-duration-700 animation-delay-2800 animate-fade">
              {content?.subtitle}
            </h3>
            <div className="animate-slide transition-transform animation-duration-700 animation-delay-3000">
              <FadeInObserver
                threshold={0.5}
                rootMargin="0px 0px -100px 0px"
                className="fade-in"
              >
                <RichText
                  body={content?.hero_body}
                  className="mx-auto text-zinc-50! mt-5 opacity-0 transition-opacity animation-duration-700 animation-delay-3500 animate-fade line-clamp-3 md:line-clamp-none"
                />
              </FadeInObserver>
            </div>
          </div>
          <div className="animate-slide transition-transform absolute bottom-8 left-1/2 -translate-x-1/2 z-20 duration-1000 delay-1000 h-12">
            <Link href="#intro" className="fade-from-view">
              <ArrowDown className="animate-bounce stroke-zinc-50" />
            </Link>
          </div>
        </div>
        <div className="content-wrap">
          <FadeInObserver
            threshold={0.1}
            rootMargin="0px 0px -10% 0px"
            className="fade-in"
          >
            {content?.intro_body ? (
              <div id="intro" className="prose prose-lg w-11/12 mx-auto">
                <RichText body={content?.intro_body} className="mx-0" />
              </div>
            ) : null}
          </FadeInObserver>
          {process.env.NODE_ENV === "production" && (
            <LazyLoad
              threshold={0.1}
              rootMargin="0px 0px -50px 0px"
              className="fade-in"
            >
              <HomeMap />
            </LazyLoad>
          )}

          <FeaturedContentLoader locale={locale} />
        </div>
      </VideoOpenZip>
    </>
  )
}

export default HomePage
