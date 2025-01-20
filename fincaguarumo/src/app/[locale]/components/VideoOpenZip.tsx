"use client"
import React, { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { useMediaQuery } from "react-responsive"

const VideoOpenZip = ({ children }: { children: React.ReactNode }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const mainContentRef = useRef<HTMLDivElement>(null)
  const animationContainerRef = useRef<HTMLDivElement>(null)

  const [played, setPlayed] = useState<boolean>(false)
  const isMobile = useMediaQuery({ query: "(max-width: 640px)" })
  useEffect(() => {
    const video = videoRef.current
    const videoContainer = videoContainerRef.current
    const mainContent = mainContentRef.current
    const animationContainer = animationContainerRef.current

    if (video) {
      const tl = gsap.timeline()
      if (!played) {
        tl.to(animationContainer, { opacity: 1, duration: 1 })
          .to(
            videoContainer,
            {
              duration: 2,
              width: "100%",
              height: "1px",
            },
            1
          )
          .to(
            videoContainer,
            {
              duration: 1,
              height: "520px",
              onComplete: () => {
                video.play()
              },
            },
            3
          )
      }

      video.addEventListener("ended", () => {
        tl.to(
          videoContainer,
          {
            delay: 2,
            duration: 2,
            height: "1px",
          },
          1
        )
          .to(
            videoContainer,
            {
              width: 0,
              duration: 1,
              onComplete: () => {
                video.pause()
              },
            },
            ">0.25"
          )
          .to(
            animationContainer,
            { height: 0, opacity: 0, duration: 1 },
            ">0.25"
          )
          .to(
            mainContent,
            {
              duration: 1,
              opacity: 1,
              height: "auto",
            },
            ">0.25"
          )
        setTimeout(() => setPlayed(true), 1000)
      })
    }
  })
  if (isMobile) return <div className="overflow-hidden flex-1">{children}</div>
  return (
    <>
      <div
        className={`relative w-screen h-[520px] overflow-hidden bg-gradient-dark`}
        ref={animationContainerRef}
      >
        <div
          className="absolute inset-0 z-10 h-0 w-0 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden"
          ref={videoContainerRef}
        >
          <video ref={videoRef} className="w-full object-cover" muted>
            <source src="/assets/title.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
      <div
        className={`h-0 opacity-0 overflow-hidden ${played ? "flex-1" : ""}`}
        ref={mainContentRef}
      >
        {children}
      </div>
    </>
  )
}

export default VideoOpenZip
