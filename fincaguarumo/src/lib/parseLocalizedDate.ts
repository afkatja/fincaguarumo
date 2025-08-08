import { parse } from "date-fns"

// Parse localized date strings (e.g., "January 15, 2024", "15 janvier 2024", etc.)
const parseLocalizedDate = (dateString: string): Date | null => {
  // Try to parse with date-fns using multiple formats
  const formats = [
    "MMMM d, yyyy", // January 15, 2024
    "d MMMM yyyy", // 15 January 2024
    "MMMM d yyyy", // January 15 2024
    "yyyy-MM-dd", // 2024-01-15 (ISO format)
    "MM/dd/yyyy", // 01/15/2024
    "dd/MM/yyyy", // 15/01/2024
  ]

  for (const format of formats) {
    try {
      const parsedDate = parse(dateString, format, new Date())
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate
      }
    } catch (error) {
      // Continue to next format
    }
  }

  // Fallback: try to parse with the Date constructor
  const date = new Date(dateString)
  if (!isNaN(date.getTime())) {
    return date
  }

  return null
}
export default parseLocalizedDate
