import { isValid, parse, startOfDay } from "date-fns"
import { de, enUS, es, nl, ru } from "date-fns/locale"

const localeMap: Record<string, Locale> = {
  en: enUS,
  es: es,
  ru: ru,
  nl: nl,
  de: de,
}

// Parse localized date strings (e.g., "January 15, 2024", "15 janvier 2024", etc.)
const parseLocalizedDate = (
  dateString: string,
  locale: string
): Date | null => {
  // Normalize locale tags like "es-ES" or "en_US" to language code ("es", "en")
  const normalized = (locale || "en").toLowerCase()
  const base = normalized.split(/[-_]/)[0]
  const dateFnsLocale: Locale = localeMap[base] || enUS

  // Prefer unambiguous formats and month-name formats first; then numeric by locale
  const baseFormats = [
    "yyyy-MM-dd", // ISO (2024-01-15)
    "MMMM d, yyyy", // January 15, 2024
    "d MMMM yyyy", // 15 January 2024
    "MMMM d yyyy", // January 15 2024
    "d MMM yyyy", // 15 Jan 2024
    "MMM d, yyyy", // Jan 15, 2024
  ]
  const numericMDY = ["M/d/yyyy", "MM/dd/yyyy"]
  const numericDMY = ["d/M/yyyy", "dd/MM/yyyy"]
  const formats = [
    ...baseFormats,
    ...(normalized.startsWith("en-us") || base === "en"
      ? numericMDY
      : numericDMY),
  ]

  for (const format of formats) {
    const parsedDate = parse(dateString, format, startOfDay(new Date()), {
      locale: dateFnsLocale,
    })
    if (isValid(parsedDate)) return parsedDate
  }

  return null
}
export default parseLocalizedDate
