const languages = [
  { id: "en", title: "English", flag: "", isDefault: true },
  { id: "nl", flag: "", title: "Nederlands" },
  { id: "es", flag: "", title: "Español" },
  { id: "ru", flag: "", title: "Русский" },
  { id: "de", flag: "", title: "Deutsch" },
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
