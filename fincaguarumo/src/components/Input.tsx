import React, { ChangeEventHandler } from "react"
import { Label } from "./ui/label"
import { cn } from "@/lib/utils"

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string
  type: string
  labelText?: string
  placeholder: string
  onChangeHandler?: ChangeEventHandler
  errorMessage: string
  required: boolean
  value?: string
  className?: string
  /** Set on the validation message element for e2e */
  errorTestId?: string
  /** Show error message after an explicit submit attempt (e.g. Next while invalid) */
  forceShowError?: boolean
  [prop: string]: any
}

const Input = ({
  id,
  type,
  labelText,
  placeholder,
  onChangeHandler,
  errorMessage,
  required,
  value,
  className = "",
  errorTestId,
  forceShowError,
  ...props
}: TextInputProps) => {
  return (
    <div className={`my-2 ${className}`}>
      {!!labelText && (
        <Label
          htmlFor={id}
          className="block input-required:outline-destructive"
        >
          {labelText}
        </Label>
      )}
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        placeholder={placeholder}
        onChange={onChangeHandler}
        value={value}
        className="w-full mt-2 p-1 pl-4 rounded-sm outline-1 outline-zinc-300 invalid:[&:not(:placeholder-shown):not(:focus)]:outline-destructive peer text-zinc-900 bg-zinc-50"
        {...props}
      />
      <span
        className={cn(
          "mt-2 text-sm text-destructive",
          forceShowError
            ? "block"
            : "hidden peer-[&:not(:placeholder-shown):not(:focus):invalid]:block",
        )}
        data-testid={errorTestId}
      >
        {errorMessage}
      </span>
    </div>
  )
}

export default Input
