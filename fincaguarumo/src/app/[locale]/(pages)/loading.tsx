import { Ellipsis } from "lucide-react"
// import Skeleton from "react-loading-skeleton"
export default function Loading({ className }: { className?: string }) {
  // return <Skeleton />
  return (
    <div
      className={`w-full max-w-[91.6%] mx-auto flex flex-1 items-center justify-center h-full ${className ?? ""}`}
    >
      <Ellipsis width={40} height={40} className="loader" />
    </div>
  )
}
