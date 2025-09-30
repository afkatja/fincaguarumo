"use client"
import { useTransition } from "react"
import { useParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter, usePathname } from "../navigation"

import { useTranslations, Translation } from "../lib/translationsUtil"
import Icon from "./Icon"

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
      <SelectTrigger className="w-12 p-0 lg:w-[180px] focus:border-none active:border-none outline-none focus:ring-0 !bg-transparent ml-2">
        <SelectValue placeholder="Choose language" />
      </SelectTrigger>
      <SelectContent>
        {availableTranslations.map(version => (
          <SelectItem key={version.language} value={version.language}>
            <div className="flex gap-2 items-center">
              <Icon
                icon={version.glyph}
                size={26}
                color="#9d1f60"
                className="fill-guarumo-accent dark:fill-zinc-50 rounded-full border-guarumo-accent dark:border-zinc-50 border p-1"
              />
              <span className="hidden lg:block">{version.title}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default LanguageSelector
