"use client"

import { useCallback } from "react"

interface ViewTransitionOptions {
  onStart?: () => void
  onFinish?: () => void
  onAbort?: () => void
}

export const useViewTransition = () => {
  const supportsViewTransitions =
    typeof document !== "undefined" && "startViewTransition" in document

  const startTransition = useCallback(
    async (
      callback: () => void | Promise<void>,
      options: ViewTransitionOptions = {}
    ) => {
      if (supportsViewTransitions) {
        try {
          options.onStart?.()
          const transition = document.startViewTransition(async () => {
            await callback()
          })

          await transition.finished
          options.onFinish?.()
        } catch (error) {
          options.onAbort?.()
          console.error("View transition failed:", error)
        }
      } else {
        // Fallback: execute callback directly
        options.onStart?.()
        await callback()
        options.onFinish?.()
      }
    },
    [supportsViewTransitions]
  )

  return {
    supportsViewTransitions,
    startTransition,
  }
}
