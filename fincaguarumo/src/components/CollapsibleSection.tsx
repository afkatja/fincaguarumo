"use client"
import React, { useState } from "react"
import { Button } from "./ui/button"
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
  className?: string
}

export const CollapsibleSection = ({
  title,
  children,
  defaultExpanded = false,
  className = "",
}: CollapsibleSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const handleToggle = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div
      className={`border border-guarumo-primary/20 rounded-lg md:border-0 overflow-hidden ${className}`}
    >
      <Button
        variant="ghost"
        className="w-full justify-between px-4 py-3 h-auto hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors md:hidden"
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
            ? "max-h-[400px] opacity-100"
            : "md:max-h-none md:opacity-100 max-h-0 opacity-0 overflow-hidden"
        }`}
      >
        <div className="p-4 pt-0 md:p-0">{children}</div>
      </div>
    </div>
  )
}
