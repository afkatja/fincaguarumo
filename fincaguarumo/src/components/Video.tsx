"use client"
import Image from "next/image"
import React, { useEffect, useRef, useState } from "react"
import ImageFallback from "./imageFallback"

const playPauseVideo = (videoElement: HTMLVideoElement) => {
  const options = {
    root: null,
    rootMargin: "0px",
    threshold: [0, 0.5, 1], // finer control
  }

  const callback: IntersectionObserverCallback = entries => {
    entries.forEach(entry => {
      if (entry.intersectionRatio >= 0.5) {
        ;(entry.target as HTMLVideoElement).play()
      } else {
        ;(entry.target as HTMLVideoElement).pause()
      }
    })
  }

  const observer = new IntersectionObserver(callback, options)
  observer.observe(videoElement)

  return observer
}

const Video = ({
  src,
  loop,
  autoPlay,
  poster,
  blurDataURL,
  critical = false,
  ...props
}: {
  src: string
  loop: boolean
  autoPlay: boolean
  poster?: string
  blurDataURL?: string
  critical?: boolean
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
    if (critical) {
      setShowVideo(true)
      return
    }
    let id: number | ReturnType<typeof setTimeout> = 0
    id = rIC(() => setShowVideo(true))

    return () => {
      if (!window.cancelIdleCallback) {
        clearTimeout(id)
      } else {
        cancelIdleCallback(id as number)
      }
    }
  }, [critical])

  useEffect(() => {
    const vid = ref?.current
    if (vid && autoPlay && showVideo) {
      const observer = playPauseVideo(vid)
      return () => observer.disconnect()
    }
  }, [autoPlay, showVideo])

  return (
    <>
      {poster ? (
        <Image
          src={poster}
          alt="hero"
          width={1920}
          height={780}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            videoVisible ? "opacity-0" : "opacity-100"
          }`}
          priority
          fetchPriority="high"
          placeholder="blur"
          blurDataURL={blurDataURL}
        />
      ) : (
        <ImageFallback shouldHideFallback={videoVisible} />
      )}
      {showVideo && (
        <video
          ref={ref}
          src={src}
          autoPlay={autoPlay}
          loop={loop}
          preload="auto"
          poster={poster}
          playsInline
          onCanPlayThrough={() => {
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
