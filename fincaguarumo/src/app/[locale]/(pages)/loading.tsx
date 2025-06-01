import { Ellipsis } from "lucide-react"
// import Skeleton from "react-loading-skeleton"
export default function Loading() {
  // return <Skeleton />
  return (
    <div className="w-full max-w-11/12 mx-auto flex items-center justify-center h-full max-h-[80vh]">
      <Ellipsis width={40} height={40} className="loader" />
    </div>
  )
}
