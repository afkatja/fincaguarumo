"use client"
import React, { useState } from "react"
import { Button } from "./ui/button"
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"

interface CollapsibleSectionProps {
  title: React.ReactNode
  children: React.ReactNode
  defaultExpanded?: boolean
  isExpanded?: boolean
  onToggle?: () => void
  className?: string
  displayOnDesktop?: boolean
}

export const CollapsibleSection = ({
  title,
  children,
  defaultExpanded = false,
  isExpanded: controlledExpanded,
  onToggle,
  className = "",
  displayOnDesktop = false,
}: CollapsibleSectionProps) => {
  const [uncontrolledExpanded, setUncontrolledExpanded] =
    useState(defaultExpanded)
  const isControlled = controlledExpanded !== undefined
  const isExpanded = isControlled ? controlledExpanded : uncontrolledExpanded

  const handleToggle = () => {
    if (isControlled) {
      onToggle?.()
    } else {
      setUncontrolledExpanded(!uncontrolledExpanded)
    }
  }

  return (
    <div
      className={`border border-guarumo-primary/20 dark:border-none rounded-lg md:border-0 overflow-hidden ${className}`}
    >
      <Button
        variant="ghost"
        className={`w-full justify-between px-4 py-3 h-auto hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors hover:translate-y-0 hover:shadow-none ${displayOnDesktop ? "" : "md:hidden"}`}
        onClick={handleToggle}
      >
        <span className="font-medium text-zinc-900 dark:text-zinc-100">
          {title}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {isExpanded ? "Show less" : "Show more"}
          </span>
          {isExpanded ? (
            <ChevronUpIcon className="h-4 w-4" />
          ) : (
            <ChevronDownIcon className="h-4 w-4" />
          )}
        </div>
      </Button>

      <div
        className={`transition-all duration-300 ease-in-out ${
          isExpanded
            ? "max-h-none opacity-100"
            : displayOnDesktop
              ? "max-h-0 opacity-0 overflow-hidden"
              : "md:max-h-none md:opacity-100"
        }`}
      >
        <div className="p-4 pt-0 md:p-0">{children}</div>
      </div>
    </div>
  )
}
