async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  const apiKey =
    process.env.NODE_ENV === "production"
      ? process.env.NEXT_PUBLIC_GOOGLE_CLOUD_API_KEY
      : process.env.GOOGLE_CLOUD_API_KEY_TEST

  if (!apiKey) {
    throw new Error(
      "NEXT_PUBLIC_GOOGLE_CLOUD_API_KEY not found in environment variables"
    )
  }

  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: text,
      source: sourceLang,
      target: targetLang,
      format: "text",
    }),
  })

  if (!response.ok) {
    console.error(
      "Google Translate API error:",
      response.statusText,
      response.status
    )
    const error = await response.json()
    throw new Error(
      `Google Translate API error: ${error.message || "Unknown error"}`
    )
  }

  const data = await response.json()

  return data.data.translations[0].translatedText
}

export default translateText
