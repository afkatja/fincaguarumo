const Badge = ({ text }: { text: string }) => {
  return (
    <span className="absolute top-0 left-0 -mt-2 -ml-2 rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
      {text}
    </span>
  )
}

export default Badge
