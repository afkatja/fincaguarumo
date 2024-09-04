const languages = [
  { id: "en", title: "English", countryCode: "US", isDefault: true },
  { id: "nl", countryCode: "NL", title: "Nederlands" },
  { id: "es", countryCode: "CR", title: "Español" },
  { id: "ru", countryCode: "RU", title: "Русский" },
  { id: "de", countryCode: "DE", title: "Deutsch" },
]

const i18n = {
  languages,
  base: languages.find(item => item.isDefault).id,
}

const googleTranslateLanguages = languages.map(({ id, title }) => ({
  id,
  title,
}))

export { i18n, googleTranslateLanguages }
