const languages = [
  {
    id: "en",
    title: "English",
    countryCode: "US",
    isDefault: true,
    glyph: "LetterW",
  },
  { id: "nl", countryCode: "NL", title: "Nederlands", glyph: "LetterIj" },
  { id: "es", countryCode: "CR", title: "Español", glyph: "LetterN" },
  { id: "ru", countryCode: "RU", title: "Русский", glyph: "LetterYa" },
  { id: "de", countryCode: "DE", title: "Deutsch", glyph: "LetterEszet" },
]

const i18n = {
  languages,
  base: languages.find(item => item.isDefault)?.id,
}

const googleTranslateLanguages = languages.map(({ id, title }) => ({
  id,
  title,
}))

export { i18n, googleTranslateLanguages }
