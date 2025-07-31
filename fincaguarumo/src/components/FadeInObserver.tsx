"use client"

import { useEffect, useRef } from "react"

interface FadeInObserverProps {
  children: React.ReactNode
  className?: string
  threshold?: number
  rootMargin?: string
}

const FadeInObserver = ({
  children,
  className = "",
  threshold = 1.0,
  rootMargin = "0px 0px 50px 0px",
}: FadeInObserverProps) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Check if Intersection Observer is supported
    if (!("IntersectionObserver" in window)) {
      // Fallback: make all elements visible immediately
      const currentRef = ref.current
      if (currentRef) {
        const fadeElements = currentRef.querySelectorAll(
          ".fade-in, .fade-from-view"
        )
        fadeElements.forEach(el => {
          el.classList.add("fade-in-visible")
        })
      }
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          // console.log(entry.intersectionRatio, entry.isIntersecting)

          if (entry.isIntersecting) {
            entry.target.classList.add("fade-in-visible")
            // Once the element is visible, we can stop observing it
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold,
        rootMargin,
      }
    )

    const currentRef = ref.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [threshold, rootMargin])

  return (
    <div ref={ref} className={`${className} h-full`}>
      {children}
    </div>
  )
}

export default FadeInObserver
