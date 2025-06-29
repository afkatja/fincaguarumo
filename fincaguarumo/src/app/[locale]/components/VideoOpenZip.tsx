"use client"
import React, { useEffect, useRef } from "react"
import gsap from "gsap"
import { useMediaQuery } from "react-responsive"

const VideoOpenZip = ({ children }: { children: React.ReactNode }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const mainContentRef = useRef<HTMLDivElement>(null)
  const animationContainerRef = useRef<HTMLDivElement>(null)

  const hasPlayed =
    typeof window !== "undefined" &&
    localStorage.getItem("videoPlayed") === "true"

  const isMobile = useMediaQuery({ query: "(max-width: 640px)" })

  useEffect(() => {
    if (hasPlayed) return

    const video = videoRef.current
    const videoContainer = videoContainerRef.current
    const mainContent = mainContentRef.current
    const animationContainer = animationContainerRef.current

    let tl: gsap.core.Timeline | null = null

    if (video) {
      tl = gsap.timeline()
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
            height: "100%",
            onComplete: () => {
              video.play()
            },
          },
          3
        )

      video.addEventListener("ended", () => {
        tl
          ?.to(
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
              onComplete: () => {
                if (typeof window !== "undefined") {
                  localStorage.setItem("videoPlayed", "true")
                }
              },
            },
            ">0.25"
          )
      })
    }

    // Cleanup function to kill timeline if component unmounts
    return () => {
      if (tl) {
        tl.kill()
      }
    }
  })

  if (isMobile) return <div className="overflow-hidden flex-1">{children}</div>

  // If video has been played before, just show the content
  if (hasPlayed) {
    return (
      <div
        className="overflow-hidden flex-1"
        ref={el => {
          if (el) {
            gsap.set(el, { clearProps: "all" })
          }
        }}
      >
        {children}
      </div>
    )
  }

  return (
    <>
      <div
        className={`relative w-screen h-[calc(100dvh-100px)] overflow-hidden bg-gradient-dark`}
        ref={animationContainerRef}
      >
        <div
          className="absolute inset-0 z-10 h-0 w-0 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden bg-zinc-950 flex flex-col justify-center items-center"
          ref={videoContainerRef}
        >
          <video
            ref={videoRef}
            className="w-11/12 mx-auto object-contain"
            muted
          >
            <source src="/assets/title.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
      <div
        className={`h-0 opacity-0 overflow-hidden ${hasPlayed ? "flex-1" : ""}`}
        ref={mainContentRef}
      >
        {children}
      </div>
    </>
  )
}

export default VideoOpenZip
