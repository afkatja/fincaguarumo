"use client"

import React from "react"
import { Check } from "lucide-react"
import { useTranslations } from "next-intl"

export type BookingStep = "dates" | "personal" | "payment" | "complete"

interface BookingProgressIndicatorProps {
  currentStep: BookingStep
  steps: { id: BookingStep; label: string }[]
  onStepClick?: (step: BookingStep) => void
  className?: string
}

export default function BookingProgressIndicator({
  currentStep,
  steps,
  onStepClick,
  className = "",
}: BookingProgressIndicatorProps) {
  const t = useTranslations("booking")

  const getStepStatus = (
    step: BookingStep,
  ): "completed" | "current" | "pending" => {
    const currentIndex = steps.findIndex(s => s.id === currentStep)
    const stepIndex = steps.findIndex(s => s.id === step)

    if (stepIndex < currentIndex) return "completed"
    if (stepIndex === currentIndex) return "current"
    return "pending"
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id)
          const isClickable = onStepClick && status === "completed"

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center flex-1">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick(step.id)}
                  disabled={!isClickable}
                  className={`
                    relative flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm transition-all duration-200
                    ${
                      status === "completed"
                        ? "bg-guarumo-primary text-white cursor-pointer hover:bg-guarumo=secondary"
                        : status === "current"
                          ? "bg-guarumo-accent text-white ring-4 ring-guarumo-accent/20"
                          : "bg-zinc-200 text-zinc-500"
                    }
                    ${isClickable ? "hover:scale-105" : ""}
                  `}
                  aria-label={step.label}
                  aria-current={status === "current" ? "step" : undefined}
                >
                  {status === "completed" ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </button>
                <span
                  className={`
                    mt-2 text-xs font-medium text-center max-w-20
                    ${
                      status === "completed"
                        ? "text-guarumo-primary"
                        : status === "current"
                          ? "text-guarumo-accent font-semibold"
                          : "text-zinc-500"
                    }
                  `}
                >
                  {step.label}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={`
                    flex-1 h-1 mx-2 rounded-full transition-colors duration-200
                    ${status === "completed" ? "bg-guarumo-primary" : "bg-zinc-200"}
                  `}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
