"use client"

import { useEffect, useRef } from "react"

interface UseFadeInOptions {
  threshold?: number
  rootMargin?: string
  className?: string
}

export const useFadeIn = ({
  threshold = 0.1,
  rootMargin = "0px 0px -50px 0px",
  className = "fade-in",
}: UseFadeInOptions = {}) => {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    // Check if Intersection Observer is supported
    if (!("IntersectionObserver" in window)) {
      // Fallback: make element visible immediately
      const currentRef = ref.current
      if (currentRef) {
        if (!currentRef.classList.contains(className)) {
          currentRef.classList.add(className)
        }
        currentRef.classList.add("fade-in-visible")
      }
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
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
      // Add the fade-in class if it's not already there
      if (!currentRef.classList.contains(className)) {
        currentRef.classList.add(className)
      }
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [threshold, rootMargin, className])

  return ref
}
