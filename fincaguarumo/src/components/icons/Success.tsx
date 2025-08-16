import React from "react"

type SuccessProps = React.SVGProps<SVGSVGElement> & {
  title?: string
  color?: string
}
const Success = ({ color, title, ...props }: SuccessProps) => {
  return (
    <svg
      width="16"
      height="14"
      fill="none"
      viewBox="0 0 16 14"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
      {...props}
    >
      <path
        fill={color}
        d="M15.47.233a.875.875 0 0 1 .047 1.236L6.142 11.594a.875.875 0 0 1-1.307-.026L.46 6.443a.875.875 0 0 1 1.33-1.136l3.737 4.376L14.233.281a.875.875 0 0 1 1.236-.048Z"
      />
    </svg>
  )
}

export default Success
