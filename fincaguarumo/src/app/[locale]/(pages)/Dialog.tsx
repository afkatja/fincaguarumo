"use client"
import React, { useState } from "react"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  // DialogBody,
  DialogFooter,
  // DialogClose,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

import { Separator } from "@/components/ui/separator"
import Payment from "./(payment)/Payment"

const BookingDialog = ({
  title,
  description,
  price,
}: {
  title: string
  description: string
  price: number
}) => {
  const [open, setOpen] = useState(false)
  const [participants, setParticipants] = useState(1)
  const [paymentStep, setPaymentStep] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [fields, setFields] = useState<{
    name: string
    email: string
    date: Date
    guests: number
  }>({
    name: "",
    email: "",
    date: new Date(),
    guests: 1,
  })

  const closeHandler = () => {
    setOpen(!open)
    setPaymentStep(false)
  }

  // const getFormData = () => {
  //   return Object.keys(fields).reduce(
  //     (formData, name) => ({
  //       ...formData,
  //       [name]: fields[name],
  //     }),
  //     {}
  //   )
  // }

  return (
    <Dialog open={open} onOpenChange={() => closeHandler()} key="order-dialog">
      <DialogTrigger asChild>
        <Button size="lg" className="ml-auto">
          Reserve Now
        </Button>
      </DialogTrigger>
      {!paymentStep && (
        <DialogContent className="min-h-[500px] sm:max-w-[500px] dark:bg-gradient-to-br dark:from-zinc-700 dark:to-sky-900 ">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4 group"
            noValidate
            onSubmit={e => {
              e.preventDefault()
              console.log(fields)
              setPaymentStep(true)
            }}
          >
            <div className="grid gap-2">
              <div className="my-1">
                <Label
                  htmlFor="name"
                  className="block input-required:outline-destructive"
                >
                  Your name *
                </Label>
                <input
                  id="name"
                  type="text"
                  required
                  placeholder="Jane Doe"
                  onBlur={e => setFields({ ...fields, name: e.target.value })}
                  className="w-full mt-2 p-1 pl-4 rounded-sm outline outline-1 outline-zinc-300 invalid:[&:not(:placeholder-shown):not(:focus)]:outline-destructive peer"
                />
                <span className="mt-2 hidden text-sm text-destructive peer-[&:not(:placeholder-shown):not(:focus):invalid]:block">
                  Please enter your name
                </span>
              </div>
              <div className="my-1">
                <Label
                  className="block required:outline-destructive"
                  htmlFor="email"
                >
                  Your email *
                </Label>
                <input
                  id="email"
                  type="email"
                  required
                  onBlur={e => setFields({ ...fields, email: e.target.value })}
                  placeholder="jane@doe.com"
                  className="w-full mt-2 p-1 pl-4 rounded-sm outline outline-1 outline-zinc-300 invalid:[&:not(:placeholder-shown):not(:focus)]:outline-destructive peer"
                  pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                />
                <span className="mb-2 hidden text-sm text-destructive peer-[&:not(:placeholder-shown):not(:focus):invalid]:block">
                  Please enter a valid email address
                </span>
              </div>
              <Label htmlFor="date">Date</Label>
              <Popover open={popoverOpen}>
                <PopoverTrigger asChild onClick={() => setPopoverOpen(true)}>
                  <Button
                    variant="outline"
                    className="flex-col items-start w-full h-auto"
                  >
                    <span className="font-semibold uppercase text-[0.65rem]">
                      Select Date
                    </span>
                    <span className="font-normal">
                      {fields.date.toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 max-w-[276px]">
                  <Calendar
                    mode="single"
                    onSelect={(_, selectedDay) => {
                      setFields({ ...fields, date: new Date(selectedDay) })
                      setPopoverOpen(false)
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="guests">Guests</Label>
              <Select
                onValueChange={val => {
                  setParticipants(Number(val))
                  setFields({ ...fields, guests: Number(val) })
                }}
              >
                <SelectTrigger className="h-auto">
                  <SelectValue
                    placeholder={
                      <div className="flex flex-col items-start">
                        <span className="font-semibold uppercase text-[0.65rem]">
                          Guests
                        </span>
                        <span className="font-normal">
                          {participants} adults
                        </span>
                      </div>
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 adult</SelectItem>
                  <SelectItem value="2">2 adults</SelectItem>
                  <SelectItem value="3">2 adults + 1 child</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* <div className="grid gap-2">
                <PaymentMethods onCheck={val => setPaymentMethod(val)} />
              </div> */}
            <DialogFooter className="flex-wrap">
              <div className="grid gap-2 flex-none w-full">
                <div className="flex items-center justify-between">
                  <div className="text-muted-foreground">
                    ${price} x {participants} people
                  </div>
                  <div>${price * participants}</div>
                </div>
                <Separator />
                <div className="flex items-center justify-between font-medium">
                  <div>Total</div>
                  <div>${price * participants}</div>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2 w-full flex-none">
                <div>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                </div>
                <Button
                  type="submit"
                  className="group-invalid:pointer-events-none group-invalid:opacity-30"
                >
                  Reserve
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      )}
      {paymentStep && (
        <DialogContent className="min-h-[500px] sm:max-w-[500px] dark:bg-gradient-to-br dark:from-zinc-700 dark:to-sky-900">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <Payment
            price={price * participants}
            description={`${title} ${description}`}
            fields={fields}
          />
        </DialogContent>
      )}
    </Dialog>
  )
}

export default BookingDialog
