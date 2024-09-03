"use client"
import { TransitionFunction, useMemo, useTransition } from "react"
import { useParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter, usePathname } from "../navigation"
// import { languages } from "../config"
import { i18n } from "../../languages"

interface Params {
  [key: string]: string | string[]
}

type Translation = {
  id: string
  path: string
  language: string
  title: string
  flag: string
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

const LanguageSelector = ({
  locale,
  translations,
}: {
  locale: string
  translations?: Translation[]
}) => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const pathname = usePathname()
  const params = useParams()

  const availableTranslations = useMemo<Translation[]>(
    () =>
      i18n.languages.reduce<Translation[]>((acc, cur) => {
        const availableTranslation = translations?.find(
          translation => translation.language === cur.id
        )
        return availableTranslation ? [...acc, availableTranslation] : acc
      }, []),
    [translations]
  )

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
        {availableTranslations.map(lang => (
          <SelectItem key={crypto.randomUUID()} value={lang.id}>
            {lang.flag}
            {lang.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default LanguageSelector
