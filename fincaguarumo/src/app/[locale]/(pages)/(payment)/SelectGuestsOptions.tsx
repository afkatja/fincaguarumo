"use client"
import React from "react"
import SelectBox from "../../../../components/ui/selectBox"
import { getInternationalizedValue } from "../../../../lib/utils"
import { useDialog } from "../../DialogProvider"

const DEFAULT_GUEST_OPTIONS = ["1", "2", "3", "4"] as const

const SelectGuestsOptions = ({
  locale,
  guests,
  onChange,
  maxGuests = DEFAULT_GUEST_OPTIONS,
}: {
  locale: string
  guests: string
  onChange: (val: string) => void
  maxGuests?: readonly string[]
}) => {
  const { dialogData: field } = useDialog()
  const guestsOptions = maxGuests.map(val => ({
    val: val,
    text: `${val} ${val === "1" ? getInternationalizedValue(field?.adult, locale, "adult") : getInternationalizedValue(field?.adult, locale, "adults")}`,
  }))

  return (
    <SelectBox
      label={getInternationalizedValue(field?.guests, locale, "Guests")}
      placeholder={
        <div className="flex flex-col items-start">
          <span className="font-semibold uppercase text-[0.65rem]">
            {getInternationalizedValue(field?.guests, locale, "Guests")}
          </span>
          <span className="font-normal">
            {guests}{" "}
            {Number(guests) === 1
              ? getInternationalizedValue(field?.adult, locale, "adult")
              : getInternationalizedValue(field?.adults, locale, "adults")}
          </span>
        </div>
      }
      onValueChange={onChange}
      values={guestsOptions}
    />
  )
}

export default SelectGuestsOptions
