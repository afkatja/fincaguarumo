"use client"

import { useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { Send, Loader2 } from "lucide-react"
import Textarea from "../Textarea"
import { Button } from "../ui/button"

interface OptimizedChatInputProps {
  onSubmit: (message: string) => void
  isLoading: boolean
  className?: string
}

export default function OptimizedChatInput({
  onSubmit,
  isLoading,
  className = "",
}: OptimizedChatInputProps) {
  const t = useTranslations("bookingChat")
  const [input, setInput] = useState("")

  // Memoize event handlers to prevent unnecessary re-renders
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (input.trim() && !isLoading) {
        onSubmit(input.trim())
        setInput("")
      }
    },
    [input, isLoading, onSubmit]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        if (input.trim() && !isLoading) {
          onSubmit(input.trim())
          setInput("")
        }
      }
    },
    [input, isLoading, onSubmit]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value)
    },
    []
  )

  return (
    <form onSubmit={handleSubmit} className={`p-4 ${className}`}>
      <div className="flex gap-2 w-full items-end">
        <Textarea
          id="chat-user-input"
          required={false}
          errorMessage=""
          value={input}
          onChangeHandler={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={t("inputPlaceholder", {
            defaultValue: "Ask about booking...",
          })}
          disabled={isLoading}
          className="flex-1"
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={isLoading || !input.trim()}
          className="mb-2 flex items-center gap-1"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span className="text-xs opacity-60 hidden sm:inline">
                {navigator.platform.includes("Mac") ? "?" : "Ctrl"}+Enter
              </span>
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
