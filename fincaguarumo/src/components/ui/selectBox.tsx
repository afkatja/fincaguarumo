import React from "react"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./select"
import { Label } from "./label"
import { titleCase } from "../../lib/utils"

const SelectBox = ({
  label,
  onValueChange,
  placeholder,
  values,
}: {
  label: string
  onValueChange: (val: string) => void
  placeholder: React.ReactNode
  values: { val: string; text: string }[]
}) => {
  return (
    <>
      <Label htmlFor="guests">{titleCase(label)}</Label>
      <Select onValueChange={onValueChange}>
        <SelectTrigger className="border border-solid border-input w-full">
          <span className="font-semibold">{placeholder}</span>
        </SelectTrigger>
        <SelectContent>
          {values.map(value => (
            <SelectItem key={crypto.randomUUID()} value={value.val}>
              {value.text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )
}

export default SelectBox
