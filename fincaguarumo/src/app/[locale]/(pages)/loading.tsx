import { Ellipsis } from "lucide-react"
// import Skeleton from "react-loading-skeleton"
export default function Loading() {
  // return <Skeleton />
  return (
    <div className="w-11/12 mx-auto flex items-center justify-center h-[80vh]">
      <Ellipsis width={40} height={40} className="loader" />
    </div>
  )
}
