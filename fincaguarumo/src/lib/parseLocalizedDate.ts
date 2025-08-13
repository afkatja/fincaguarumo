import { isValid, parse } from "date-fns"
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
  // Try to parse with date-fns using multiple formats
  const formats = [
    "MMMM d, yyyy", // January 15, 2024
    "d MMMM yyyy", // 15 January 2024
    "MMMM d yyyy", // January 15 2024
    "yyyy-MM-dd", // 2024-01-15 (ISO format)
    "MM/dd/yyyy", // 01/15/2024
    "dd/MM/yyyy", // 15/01/2024
  ]
  const dateFnsLocale = localeMap[locale] || enUS

  for (const format of formats) {
    const parsedDate = parse(
      dateString,
      format,
      new Date(),
      locale ? { locale: dateFnsLocale } : undefined
    )
    if (isValid(parsedDate)) return parsedDate
  }

  // Fallback: try to parse with the Date constructor
  const date = new Date(dateString)
  if (isValid(date)) return date

  return null
}
export default parseLocalizedDate
