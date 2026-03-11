"use client"

import { useEffect, useState } from "react"
import gsap from "gsap"
import { TransitionRouter, useTransitionState } from "next-transition-router"
import { useViewTransition } from "../../components/useViewTransition"

const TransitionProvider = ({ children }: { children: React.ReactNode }) => {
  // const { stage, isReady } = useTransitionState()
  const { supportsViewTransitions, startTransition } = useViewTransition()

  return (
    <TransitionRouter
      auto
      leave={async next => {
        if (supportsViewTransitions) {
          // Use View Transitions API for better performance
          await startTransition(() => {
            next()
          })
        } else {
          // GSAP fallback for older browsers
          const tween = await gsap.fromTo(
            ".animation-container",
            { opacity: 1 },
            { opacity: 0, duration: 0.3 },
          )
          next()
          return () => tween.kill()
        }
      }}
      enter={async next => {
        if (supportsViewTransitions) {
          // View Transitions API handles enter animations automatically
          next()
        } else {
          // GSAP fallback for older browsers
          const tween = await gsap.fromTo(
            ".animation-container",
            { opacity: 0 },
            { opacity: 1, duration: 0.3 },
          )
          next()
          return () => tween.kill()
        }
      }}
    >
      {children}
    </TransitionRouter>
  )
}

export function GlobalLoader() {
  const { stage, isReady } = useTransitionState()
  const [showLoader, setShowLoader] = useState(false)
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (stage !== "none") {
      setShowLoader(true)
      if (hideTimeout) clearTimeout(hideTimeout)
    } else if (isReady === false) {
      // Delay hide until ready
    } else {
      const timeout = setTimeout(() => setShowLoader(false), 300)
      setHideTimeout(timeout)
    }
  }, [stage, isReady])

  if (!showLoader) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
    </div>
  )
}
export default TransitionProvider
