"use client"
import { TransitionFunction, useTransition } from "react"
import { useParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter, usePathname } from "../navigation"
import { languages } from "../config"

interface Params {
  [key: string]: string | string[]
}

function onSelectChange({
  val,
  startTransition,
  router,
  pathname,
  params,
}: {
  val: string
  startTransition: (scope: TransitionFunction) => void
  router: any
  pathname: string
  params: Params
}) {
  startTransition(() => {
    router.replace(
      // @ts-expect-error -- TypeScript will validate that only known `params`
      // are used in combination with a given `pathname`. Since the two will
      // always match for the current route, we can skip runtime checks.
      { pathname, params },
      { locale: val }
    )
  })
}

const LanguageSelector = ({ locale }: { locale: string }) => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const pathname = usePathname()
  const params = useParams()
  return (
    <Select
      defaultValue={locale}
      onValueChange={val =>
        onSelectChange({ val, startTransition, router, pathname, params })
      }
      disabled={isPending}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Choose language" />
      </SelectTrigger>
      <SelectContent>
        {languages.map(lang => (
          <SelectItem key={crypto.randomUUID()} value={lang.value}>
            {lang.flag}
            {lang.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default LanguageSelector
