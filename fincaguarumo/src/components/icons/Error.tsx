import React from "react"

type ErrorProps = React.SVGProps<SVGSVGElement> & {
  title?: string
  color?: string
}

const Error = ({ title, color = "#fff", ...props }: ErrorProps) => {
  return (
    <svg
      width="16"
      height="16"
      fill="none"
      viewBox="0 0 16 16"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
      {...props}
    >
      <path
        fill={color}
        d="M1.256 1.256a.875.875 0 0 1 1.238 0L8 6.763l5.506-5.507a.875.875 0 1 1 1.238 1.238L9.237 8l5.507 5.506a.875.875 0 1 1-1.238 1.238L8 9.237l-5.506 5.507a.875.875 0 0 1-1.238-1.238L6.763 8 1.256 2.494a.875.875 0 0 1 0-1.238Z"
      />
    </svg>
  )
}

export default Error
