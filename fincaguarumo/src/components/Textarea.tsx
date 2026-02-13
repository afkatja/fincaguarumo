import React from "react"

const Textarea = ({
  value,
  onChangeHandler,
  placeholder,
  required,
  errorMessage,
  id,
  className,
  ...props
}: {
  value: string
  onChangeHandler: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder: string
  required: boolean
  errorMessage?: string
  id: string
  className?: string
  [prop: string]: any
}) => {
  return (
    <div className={`my-1 ${className || ""}`}>
      <textarea
        id={id}
        name={id}
        value={value}
        onChange={onChangeHandler}
        required={required}
        rows={4}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-sm outline-1 outline-zinc-300 invalid:[&:not(:placeholder-shown):not(:focus)]:outline-destructive peer text-zinc-900 bg-zinc-50"
        {...props}
      />
      <span className="mt-2 hidden text-sm text-destructive peer-[&:not(:placeholder-shown):not(:focus):invalid]:block">
        {errorMessage}
      </span>
    </div>
  )
}

export default Textarea
