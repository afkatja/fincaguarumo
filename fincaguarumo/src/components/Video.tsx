"use client"
import Image from "next/image"
import React, { useEffect, useRef, useState } from "react"

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
  ...props
}: {
  src: string
  loop: boolean
  autoPlay: boolean
  poster?: string
  [prop: string]: any
}) => {
  const ref = useRef(null)
  const [showVideo, setShowVideo] = useState(false)

  useEffect(() => {
    const id = requestIdleCallback(() => setShowVideo(true))
    return () => cancelIdleCallback(id)
  }, [])

  useEffect(() => {
    const vid = ref?.current
    if (vid && autoPlay && showVideo) playPauseVideo(vid)
  })

  return (
    <>
      {poster ? (
        <Image
          src={poster}
          alt="hero"
          width={1920}
          height={780}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            showVideo ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        />
      ) : (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`text-muted-foreground/50 absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            showVideo ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <path
            d="M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19ZM8.5 13.5L11 16.51L14.5 12L19 18H5L8.5 13.5Z"
            fill="currentColor"
          />
        </svg>
      )}
      {showVideo && (
        <video
          ref={ref}
          src={src}
          autoPlay={autoPlay}
          loop={loop}
          preload="none"
          poster={poster}
          {...props}
        />
      )}
    </>
  )
}

export default Video
