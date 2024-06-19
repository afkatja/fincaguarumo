import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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

const LanguageSelector = ({
  locale,
  setLocale,
}: {
  locale: string
  setLocale: (locale: string) => void
}) => (
  <Select defaultValue={locale} onValueChange={val => setLocale(val)}>
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

export default LanguageSelector
