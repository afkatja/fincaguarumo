import React from "react"

import DropdownInput, { DropdownInputProps } from "./DropdownInput"
import ReactCountryFlag from "react-country-flag"
import { getCountryCode, ICountry, TCountries } from "countries-list"

interface DropdownOption {
  name: string
  label: React.ReactNode
  value: string
  color?: string
}

interface CountriesDropdownProps {
  countries: TCountries
  defaultCountry: ICountry
  errorMessage?: string
  name: string
  className?: string
  dropdownProps?: Partial<DropdownInputProps<DropdownOption>>
  onCountrySelect: (value: string) => void
  value?: string
  [prop: string]: any
}

const CountriesDropdown: React.FC<CountriesDropdownProps> =
  function CountriesDropdown({ name, onCountrySelect, countries }) {
    return (
      <DropdownInput
        className="flex-[90px_0_0_auto] mr-2 my-1 mt-3"
        name={name}
        options={Object.values(countries).map(({ name, phone }) => {
          const code = getCountryCode(name) || name
          const phoneCode = phone[0] || 0
          return {
            name,
            label: [
              <ReactCountryFlag
                key={code}
                countryCode={code}
                svg
                style={{ marginRight: 5, fontSize: "1.5rem" }}
              />,
              <span className="country-name-select ml-2" key={`name-${code}`}>
                {name} (+{phoneCode})
              </span>,
            ],
            value: String(phoneCode),
            color: "#000",
          }
        })}
        itemPredicate={(option: any, value: string) => {
          if (!value) return true

          const v = value.toLowerCase()
          const name = option.data.name.toLowerCase()
          const phoneCode = option.value.toString().toLowerCase()
          return name.indexOf(v) > -1 || phoneCode.indexOf(v) > -1
        }}
        onChange={onCountrySelect}
      />
    )
  }

export default CountriesDropdown
