import React, { ChangeEventHandler } from "react"
import { Label } from "./ui/label"
import { StringDecoder } from "string_decoder"

const Input = ({
  id,
  type,
  labelText,
  placeholder,
  onChangeHandler,
  errorMessage,
  required,
  value,
  ...props
}: {
  id: string
  type: string
  labelText: string
  placeholder: string
  onChangeHandler: ChangeEventHandler
  errorMessage: string
  required: boolean
  value?: string
  [prop: string]: any
}) => {
  return (
    <div className="my-1">
      <Label htmlFor={id} className="block input-required:outline-destructive">
        {labelText}
      </Label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        placeholder={placeholder}
        onChange={onChangeHandler}
        value={value}
        className="w-full mt-2 p-1 pl-4 rounded-sm outline outline-1 outline-zinc-300 invalid:[&:not(:placeholder-shown):not(:focus)]:outline-destructive peer text-zinc-900"
        {...props}
      />
      <span className="mt-2 hidden text-sm text-destructive peer-[&:not(:placeholder-shown):not(:focus):invalid]:block">
        {errorMessage}
      </span>
    </div>
  )
}

export default Input
