"use client"

import { startTransition as reactStartTransition } from "react"

interface ViewTransitionOptions {
  onStart?: () => void
  onFinish?: () => void
  onAbort?: () => void
}

export const useViewTransition = () => {
  const supportsViewTransitions =
    typeof document !== "undefined" && "startViewTransition" in document

  const startTransition = async (
    callback: () => void | Promise<void>,
    options: ViewTransitionOptions = {},
  ) => {
    if (supportsViewTransitions) {
      try {
        // React 19's startTransition for better integration
        reactStartTransition(() => {
          options.onStart?.()
          const transition = document.startViewTransition(async () => {
            await callback()
          })

          transition.finished
            .then(() => {
              options.onFinish?.()
            })
            .catch(error => {
              options.onAbort?.()
              console.error("View transition failed:", error)
            })
        })
      } catch (error) {
        options.onAbort?.()
        console.error("View transition failed:", error)
      }
    } else {
      // Fallback: use React 19's startTransition for non-view-transition browsers
      reactStartTransition(() => {
        options.onStart?.()
        Promise.resolve(callback())
          .then(() => {
            options.onFinish?.()
          })
          .catch(error => {
            options.onAbort?.()
            console.error("Transition callback failed:", error)
          })
      })
    }
  }

  return {
    supportsViewTransitions,
    startTransition,
  }
}
