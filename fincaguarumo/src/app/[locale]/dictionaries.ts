import "server-only"

const dictionaries = {
  en: () => import("../../dictionaries/en.json").then(module => module.default),
  nl: () => import("../../dictionaries/nl.json").then(module => module.default),
  ru: () => import("../../dictionaries/ru.json").then(module => module.default),
  es: () => import("../../dictionaries/es.json").then(module => module.default),
}

export const getDictionary = async (locale: string) =>
  await dictionaries[locale as string]()
