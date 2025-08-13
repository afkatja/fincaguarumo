import React, { useState } from "react"

import Input from "./Input"
import { DropdownInputProps } from "./DropdownInput"
import CountriesDropdown from "./CountriesDropdown"
import { countries, getCountryCode, ICountry } from "countries-list"
import { Label } from "./ui/label"

interface DropdownOption {
  name: string
  phoneCode: number
  label: React.ReactNode
  value: string
  [key: string]: any
}

interface PhoneInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "onChange" | "value"
  > {
  onChange: (val: string) => void
  defaultCountry: string
  id: string
  dropdownProps?: Partial<DropdownInputProps<DropdownOption>>
  value?: string
  errorMessage: string
  labelText: string
  placeholder: string
  required?: boolean
}

const PhoneInput: React.FC<PhoneInputProps> = function PhoneInput({
  name,
  errorMessage,
  labelText,
  id,
  placeholder,
  onChange,
  required = false,
}) {
  const defaultCountry = countries.CR
  const [country, setCountry] = useState("")

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(country + e.target.value)
  }

  const handleCountrySelect = (val: string) => {
    setCountry(val)
  }

  return (
    <>
      <Label htmlFor={id} className="block input-required:outline-destructive">
        {labelText}
      </Label>
      <div className="flex flex-wrap items-center">
        <CountriesDropdown
          name="countries"
          countries={countries}
          defaultCountry={defaultCountry}
          onCountrySelect={handleCountrySelect}
        />
        <Input
          id={id}
          name={name}
          onChangeHandler={handleNumberChange}
          type="tel"
          inputMode="tel"
          errorMessage={errorMessage}
          placeholder={placeholder}
          required={required || false}
          className="flex-1"
        />
      </div>
    </>
  )
}

export default PhoneInput
