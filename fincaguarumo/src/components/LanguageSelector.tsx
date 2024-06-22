"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePathname, useRouter } from "next/navigation"

const languages = [
  {
    value: "en",
    flag: "",
    title: "English",
  },
  {
    value: "nl",
    flag: "",
    title: "Nederlands",
  },
  {
    value: "ru",
    flag: "",
    title: "Русский",
  },
  {
    value: "es",
    flag: "",
    title: "Español",
  },
]

const LanguageSelector = ({ locale }: { locale: string }) => {
  const router = useRouter()
  const changeLocale = (locale: string) => router.replace(locale)
  return (
    <Select defaultValue={locale} onValueChange={val => changeLocale(val)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Choose language" />
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang, i) => (
          <SelectItem key={i} value={lang.value}>
            {lang.flag}
            {lang.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default LanguageSelector
