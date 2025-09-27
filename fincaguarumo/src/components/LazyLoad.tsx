"use client"

import { useEffect, useRef, useState } from "react"

export default function LazyFadeIn({
  children,
  threshold = 0.1,
  rootMargin = "0px 0px -10% 0px",
  className = "opacity-0 translate-y-5 transition-all duration-700 ease-out",
}: {
  children: React.ReactNode
  threshold?: number
  rootMargin?: string
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            setHasMounted(true) // mount children once visible
            observer.disconnect()
          }
        })
      },
      { threshold, rootMargin }
    )

    if (ref.current) observer.observe(ref.current)

    return () => observer.disconnect()
  }, [threshold, rootMargin])

  return (
    <div
      ref={ref}
      className={`${className} ${isVisible ? "fade-in-visible opacity-100 translate-y-0" : ""}`}
    >
      {hasMounted ? children : null}
    </div>
  )
}
