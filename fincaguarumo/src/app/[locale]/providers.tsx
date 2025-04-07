"use client"

import gsap from "gsap"
import { TransitionRouter, useTransitionState } from "next-transition-router"

const TransitionProvider = ({ children }: { children: React.ReactNode }) => {
  const { stage, isReady } = useTransitionState()

  // console.log({ stage, isReady })

  return (
    <TransitionRouter
      auto
      leave={async next => {
        const tween = await gsap.fromTo(
          ".animation-container",
          { opacity: 1 },
          { opacity: 0 }
        )
        next()
        return () => tween.kill()
      }}
      enter={async next => {
        const tween = await gsap.fromTo(
          ".animation-container",
          { opacity: 0 },
          { opacity: 1 }
        )
        next()
        return () => tween.kill()
      }}
    >
      {children}
    </TransitionRouter>
  )
}
export default TransitionProvider
