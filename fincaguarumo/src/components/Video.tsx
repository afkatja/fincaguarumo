"use client"
import Head from "next/head"
import Image from "next/image"
import React, { useEffect, useRef, useState } from "react"
import ImageFallback from "./imageFallback"

const playPauseVideo = (videoElement: HTMLVideoElement) => {
  const options = {
    root: null,
    rootMargin: "0px",
    threshold: 0.5,
  }
  const callback: IntersectionObserverCallback = entries => {
    entries.forEach(entry => {
      const visiblePct = `${Math.floor(entry.intersectionRatio * 100)}%`
      // console.log({ entry, visiblePct })
      if (entry.isIntersecting) {
        // @ts-expect-error
        entry.target.play()
      } else {
        // @ts-expect-error
        entry.target.pause()
      }
    })
  }
  const observer = new IntersectionObserver(callback, options)
  observer.observe(videoElement)
}

const Video = ({
  src,
  loop,
  autoPlay,
  poster,
  blurDataURL,
  ...props
}: {
  src: string
  loop: boolean
  autoPlay: boolean
  poster?: string
  blurDataURL?: string
  [prop: string]: any
}) => {
  const ref = useRef(null)
  const [showVideo, setShowVideo] = useState(false)
  const [videoVisible, setVideoVisible] = useState(false)
  const rIC = (cb: FrameRequestCallback) =>
    "requestIdleCallback" in window
      ? (window as any).requestIdleCallback(cb)
      : setTimeout(cb, 200)

  useEffect(() => {
    let id: number | ReturnType<typeof setTimeout> = 0
    id = rIC(() => setShowVideo(true))

    return () => {
      if (!window.cancelIdleCallback) {
        clearTimeout(id)
      } else {
        cancelIdleCallback(id as number)
      }
    }
  }, [])

  useEffect(() => {
    const vid = ref?.current
    if (vid && autoPlay && showVideo) playPauseVideo(vid)
  })

  return (
    <>
      <Head>
        <link rel="preload" as="image" href={poster} />
      </Head>
      {poster ? (
        <Image
          src={poster}
          alt="hero"
          width={1920}
          height={780}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            videoVisible ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
          priority
          placeholder="blur"
          blurDataURL={blurDataURL}
        />
      ) : (
        <ImageFallback loading={!showVideo} />
      )}
      {showVideo && (
        <video
          ref={ref}
          src={src}
          autoPlay={autoPlay}
          loop={loop}
          preload="none"
          poster={poster}
          playsInline
          onCanPlay={() => {
            // fade-in the video over the poster
            setVideoVisible(true)
          }}
          className={`object-cover transition-opacity duration-700 ${videoVisible ? "opacity-100" : "opacity-0"} ${props.className}`}
          {...props}
        />
      )}
    </>
  )
}

export default Video
