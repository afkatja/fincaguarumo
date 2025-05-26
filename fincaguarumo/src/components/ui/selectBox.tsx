import React from "react"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./select"
import { Label } from "./label"

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
      <Label htmlFor="guests">{label}</Label>
      <Select onValueChange={onValueChange}>
        <SelectTrigger className="h-auto">
          <SelectValue placeholder={placeholder} />
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
