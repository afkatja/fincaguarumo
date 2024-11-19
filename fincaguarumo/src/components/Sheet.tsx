"use client"
import React, { useState } from "react"
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import Icon from "./Icon"

const SheetPane = ({
  children,
}: {
  children: React.ReactNode | React.ReactNode[]
}) => {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setOpen(true)}
        >
          <Icon icon="Menu" className="w-6 h-6 dark:stroke-white" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        onCloseClick={() => setOpen(false)}
        onInteractOutside={() => setOpen(false)}
      >
        <div className="grid gap-6 p-6">
          {React.Children.map(children, element => {
            if (!element) return null
            return React.cloneElement(element as JSX.Element, {
              onClick: () => setOpen(!open),
            })
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default SheetPane
