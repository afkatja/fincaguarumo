interface ChatCloseIconProps extends React.SVGAttributes<SVGSVGElement> {
  width?: number
  height?: number
}

function ChatCloseIcon({
  width = 24,
  height = 24,
  ...props
}: ChatCloseIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
export default ChatCloseIcon
