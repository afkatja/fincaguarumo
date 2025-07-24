"use client"

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
            { opacity: 0, duration: 0.3 }
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
            { opacity: 1, duration: 0.3 }
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
export default TransitionProvider
