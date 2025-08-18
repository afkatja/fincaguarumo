import React from "react"

type InfoProps = React.SVGProps<SVGSVGElement> & {
  title?: string
  color?: string
}

const Info = ({ title, color = "#fff", ...props }: InfoProps) => {
  return (
    <svg
      width="14"
      height="14"
      fill="none"
      viewBox="0 0 14 14"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
      {...props}
    >
      <path
        fill={color}
        d="M10 1.5H4A2.5 2.5 0 0 0 1.5 4v6A2.5 2.5 0 0 0 4 12.5h6a2.5 2.5 0 0 0 2.5-2.5V4A2.5 2.5 0 0 0 10 1.5ZM4 0a4 4 0 0 0-4 4v6a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4V4a4 4 0 0 0-4-4H4Z"
      />
      <path
        fill={color}
        d="M5.25 7A.75.75 0 0 1 6 6.25h1.25A.75.75 0 0 1 8 7v3.5a.75.75 0 0 1-1.5 0V7.75H6A.75.75 0 0 1 5.25 7ZM5.75 4c0-.69.56-1.25 1.25-1.25S8.25 3.31 8.25 4 7.69 5.25 7 5.25 5.75 4.69 5.75 4Z"
      />
    </svg>
  )
}

export default Info
