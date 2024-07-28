import "server-only"

const dictionaries = {
  en: () => import("../../messages/en.json").then(module => module.default),
  nl: () => import("../../messages/nl.json").then(module => module.default),
  ru: () => import("../../messages/ru.json").then(module => module.default),
  es: () => import("../../messages/es.json").then(module => module.default),
}

export const getDictionary = async (locale: string) =>
  await dictionaries[locale as string]()
