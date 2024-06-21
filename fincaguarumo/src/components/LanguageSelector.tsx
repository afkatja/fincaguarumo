"use client"
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

const LanguageSelector = ({ locale }: { locale: string }) => (
  <Select defaultValue={locale} onValueChange={val => console.log(val)}>
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
