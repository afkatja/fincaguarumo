const locales = ["en", "nl", "es", "ru", "de"]

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
  {
    value: "de",
    flag: "",
    title: "Deutsch",
  },
]

const featureFlags = {
  USE_TRAVEL_PROUD_LOGO:
    process.env.NEXT_PUBLIC_USE_TRAVEL_PROUD_LOGO === "true",
}

export { locales, languages, featureFlags }
