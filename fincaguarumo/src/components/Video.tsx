"use client"
import React, { useEffect, useRef } from "react"

const playPauseVideo = (videoElement: HTMLVideoElement) => {
  const options = {
    root: null,
    rootMargin: "0px",
    threshold: 0.5,
  }
  const callback: IntersectionObserverCallback = entries => {
    entries.forEach(entry => {
      const visiblePct = `${Math.floor(entry.intersectionRatio * 100)}%`
      console.log({ entry, visiblePct })
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
  ...props
}: {
  src: string
  loop: boolean
  autoPlay: boolean
  [prop: string]: any
}) => {
  const ref = useRef(null)
  useEffect(() => {
    const vid = ref?.current
    if (vid) playPauseVideo(vid)
  })
  return (
    <video ref={ref} src={src} autoPlay={autoPlay} loop={loop} {...props} />
  )
}

export default Video
