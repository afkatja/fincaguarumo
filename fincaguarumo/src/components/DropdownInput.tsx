"use client"
import React from "react"

import { Label } from "./ui/label"
import Select from "react-select"

interface DropdownOption {
  label: React.ReactNode
  value: string
  [data: string]: any
}

export interface DropdownInputProps<
  TOption extends DropdownOption = DropdownOption,
> {
  options: TOption[]
  value?: string
  onChange: (value: string) => void
  label?: React.ReactNode
  itemPredicate?: (option: any, value: string) => boolean
  position?: "popper" | "item-aligned" | undefined
  className?: string
  inputStyle?: React.CSSProperties
  [prop: string]: any
}

const DEFAULT_ITEM_PREDICATE = (option: any, value: string) => {
  const v =
    typeof option.label === "string" ? option.label : (option.value ?? "")
  return v.toLowerCase().indexOf(value.toLowerCase()) > -1
}

const DropdownInput = <TOption extends DropdownOption = DropdownOption>({
  options,
  value,
  onChange,
  label,
  itemPredicate = DEFAULT_ITEM_PREDICATE,
  className = "",
}: DropdownInputProps<TOption>) => {
  const styles = {
    control: (base: any) => ({
      ...base,
      minHeight: "32px",
      height: "34px",
      width: "200px",
      borderColor: "#d1d5db", // Tailwind's gray-300
      boxShadow: "none",
      "&:hover": {
        borderColor: "#9ca3af", // Tailwind's gray-400
      },
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? "#f3f4f6" : "white", // Tailwind's gray-100
      color: state.isFocused ? "#111827" : "#374151", // Tailwind's gray-900
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      "&:active": {
        backgroundColor: "#e5e7eb", // Tailwind's gray-200
      },
    }),
    menu: (base: any) => ({
      ...base,
      width: "300px",
    }),
  }

  return (
    <div className={className}>
      {label && (
        <Label className="block text-sm font-medium mb-2">{label}</Label>
      )}
      <Select<DropdownOption>
        className="react-select"
        defaultValue={options.find(option => option.value === value)}
        isSearchable
        name="color"
        options={options}
        blurInputOnSelect
        onChange={selected => onChange(selected ? selected.value : "")}
        styles={styles}
        filterOption={itemPredicate}
      />
    </div>
  )
}

export default DropdownInput
