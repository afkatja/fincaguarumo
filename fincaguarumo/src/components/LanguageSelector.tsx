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
import { i18n } from "../../languages"
import ReactCountryFlag from "react-country-flag"

import { useTranslations, Translation } from "../lib/translationsUtil"

const LanguageSelector = ({
  locale,
  translations,
}: {
  locale: string
  translations: Translation[]
}) => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const pathname = usePathname()
  const params = useParams()

  const { onSelectChange, availableTranslations } =
    useTranslations(translations)

  return (
    <Select
      defaultValue={locale}
      onValueChange={val =>
        onSelectChange({ val, startTransition, router, pathname, params })
      }
      disabled={isPending}
    >
      <SelectTrigger className="w-12 p-0 lg:w-[180px] focus:border-none active:border-none focus:ring-0 bg-transparent ml-2">
        <SelectValue placeholder="Choose language" />
      </SelectTrigger>
      <SelectContent>
        {availableTranslations.map(version => (
          <SelectItem key={crypto.randomUUID()} value={version.language}>
            <ReactCountryFlag
              countryCode={version.countryCode.toUpperCase()}
              svg
              style={{ marginRight: 5, fontSize: "1.5rem" }}
            />
            <span className="hidden lg:inline">{version.title}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default LanguageSelector
