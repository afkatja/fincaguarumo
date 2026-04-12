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
  selectTestId,
}: {
  label: string
  onValueChange: (val: any) => void
  placeholder: React.ReactNode
  values: { val: string; text: string }[]
  /** Wrapper id for e2e (contains the Radix trigger button) */
  selectTestId?: string
}) => {
  return (
    <div data-testid={selectTestId}>
      <Label htmlFor="guests">{titleCase(label)}</Label>
      <Select onValueChange={onValueChange}>
        <SelectTrigger className="border border-solid border-input w-full">
          <span className="font-semibold">{placeholder}</span>
        </SelectTrigger>
        <SelectContent>
          {values.map(value => (
            <SelectItem
              key={value.val}
              value={value.val}
              data-testid={
                value.val === "2" ? "select-2-guests" : undefined
              }
            >
              {value.text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default SelectBox
