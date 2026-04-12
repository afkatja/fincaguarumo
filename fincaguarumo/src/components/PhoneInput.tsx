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

interface PhoneInputProps extends Omit<
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
  forceShowError?: boolean
}

const PhoneInput: React.FC<PhoneInputProps> = function PhoneInput({
  name,
  errorMessage,
  labelText,
  id,
  placeholder,
  onChange,
  required = false,
  value,
  pattern,
  forceShowError,
}) {
  const defaultCountry = countries.CR
  const [country, setCountry] = useState("")

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  const handleCountrySelect = (val: string) => {
    setCountry(val)
    // Prepend the new country code to the existing phone number
    if (value && !value.startsWith(val)) {
      onChange(val + value.replace(/^\+\d+/, ""))
    }
  }

  return (
    <div className="my-2">
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
          errorTestId="phone-error"
          forceShowError={forceShowError}
          placeholder={placeholder}
          pattern={pattern}
          required={required || false}
          className="flex-1 mt-0"
          data-testid="phone"
          value={value}
        />
      </div>
    </div>
  )
}

export default PhoneInput
