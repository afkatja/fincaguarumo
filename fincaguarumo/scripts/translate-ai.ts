import "dotenv/config"
import fs from "fs/promises"
import path from "path"
import { languages } from "../src/config.js"

type Lang = (typeof languages)[number]

type TranslateProvider = "google" | "ollama" | "libretranslate" | "huggingface"

interface TranslateOptions {
  provider: TranslateProvider
  ollamaHost?: string
  ollamaModel?: string
  libretranslateUrl?: string
  huggingfaceToken?: string
  huggingfaceModel?: string
}

const DEFAULT_PROVIDER: TranslateProvider = "google"

function getProvider(): TranslateProvider {
  return (
    (process.env.TRANSLATION_PROVIDER as TranslateProvider) || DEFAULT_PROVIDER
  )
}

function getOptions(): TranslateOptions {
  return {
    provider: getProvider(),
    ollamaHost: process.env.OLLAMA_HOST || "http://localhost:11434",
    ollamaModel: process.env.OLLAMA_MODEL || "llama3.2",
    libretranslateUrl:
      process.env.LIBRETRANSLATE_URL || "https://libretranslate.com/translate",
    huggingfaceToken: process.env.HUGGINGFACE_TOKEN,
    huggingfaceModel:
      process.env.HUGGINGFACE_MODEL || "meta-llama/Meta-Llama-3.1-8B-Instruct",
  }
}

async function translateWithOllama(
  text: string,
  target: string,
  options: TranslateOptions,
): Promise<string | null> {
  const { ollamaHost, ollamaModel } = options
  const prompt = `Translate the following text to ${target}. Return ONLY the translation, no explanations:\n\n${text}`

  try {
    const res = await fetch(`${options.ollamaHost}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: options.ollamaModel,
        prompt,
        stream: false,
        options: { temperature: 0.1 },
      }),
    })

    if (!res.ok) throw new Error(`Ollama error: ${res.statusText}`)

    const data = await res.json()
    return data.response?.trim() || null
  } catch (err) {
    console.error("Ollama translation error:", err)
    return null
  }
}

async function translateWithLibreTranslate(
  text: string,
  target: string,
  options: TranslateOptions,
): Promise<string | null> {
  try {
    const res = await fetch(`${options.libretranslateUrl}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: "en",
        target: target,
        format: "text",
      }),
    })

    if (!res.ok) throw new Error(`LibreTranslate error: ${res.statusText}`)

    const data = await res.json()
    return data.translatedText || null
  } catch (err) {
    console.error("LibreTranslate error:", err)
    return null
  }
}

async function translateWithHuggingFace(
  text: string,
  target: string,
  options: TranslateOptions,
): Promise<string | null> {
  if (!options.huggingfaceToken) {
    console.warn("Hugging Face token not set")
    return null
  }

  const prompt = `Translate to ${target}: "${text}"\nTranslation:`

  try {
    const res = await fetch(
      `https://api-inference.huggingface.co/models/${options.huggingfaceModel}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.huggingfaceToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 100,
            temperature: 0.1,
            return_full_text: false,
          },
        }),
      },
    )

    if (!res.ok) throw new Error(`HuggingFace error: ${res.statusText}`)

    const data = await res.json()
    return data[0]?.generated_text?.trim() || null
  } catch (err) {
    console.error("HuggingFace translation error:", err)
    return null
  }
}

async function autoTranslate(
  text: string,
  target: Lang,
  options: TranslateOptions,
): Promise<string | null> {
  const targetLang = target.value
  console.log("Translating with...", options.provider)

  switch (options.provider) {
    case "ollama":
      return translateWithOllama(text, targetLang, options)
    case "libretranslate":
      return translateWithLibreTranslate(text, targetLang, options)
    case "huggingface":
      return translateWithHuggingFace(text, targetLang, options)
    case "google":
    default:
      // Fall through to google translate
      const { translate } = await import("@vitalets/google-translate-api")
      try {
        const res = await translate(text, { to: targetLang })
        return res.text
      } catch (err) {
        console.error("Google translate error:", err)
        return null
      }
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function syncObject(
  enObj: Record<string, any>,
  langObj: Record<string, any>,
  lang: Lang,
  options: TranslateOptions,
): Promise<[Record<string, any>, boolean]> {
  let updated = false

  for (const [key, value] of Object.entries(enObj)) {
    if (typeof value === "string") {
      if (!(key in langObj) || value === null || langObj[key] === null) {
        const translated = await autoTranslate(value, lang, options)
        if (translated) {
          langObj[key] = translated
          updated = true
          console.log(
            `  ✓ ${lang.value}: "${value.substring(0, 50)}..." → "${translated.substring(0, 50)}..."`,
          )
        }
      }
    } else if (typeof value === "object" && value !== null) {
      if (!(key in langObj)) {
        langObj[key] = {}
        updated = true
      }
      const [nested, nestedUpdated] = await syncObject(
        value,
        langObj[key],
        lang,
        options,
      )
      langObj[key] = nested
      if (nestedUpdated) updated = true
    }
  }

  return [langObj, updated]
}

async function syncTranslations(
  options: TranslateOptions = getOptions(),
): Promise<void> {
  const localesDir = path.join(process.cwd(), "src", "messages")
  const enPath = path.join(localesDir, "en.json")

  const enData = JSON.parse(await fs.readFile(enPath, "utf-8"))

  for (const lang of languages) {
    if (lang.value === "en") continue

    const filePath = path.join(localesDir, `${lang.value}.json`)
    let data: Record<string, any> = {}
    try {
      data = JSON.parse(await fs.readFile(filePath, "utf-8"))
    } catch {
      data = {}
    }

    console.log(`🔄 Syncing ${lang.value} (${lang.label})...`)
    const [synced, updated] = await syncObject(enData, data, lang, options)

    if (updated) {
      await fs.writeFile(filePath, JSON.stringify(synced, null, 2) + "\n")
      console.log(`✅ Updated ${lang.value}.json`)
    } else {
      console.log(`✓ ${lang.value} already up to date`)
    }
  }
}

import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)

if (process.argv[1] === __filename) {
  const provider = process.argv[2] as TranslateProvider | undefined
  if (provider) process.env.TRANSLATION_PROVIDER = provider

  syncTranslations().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
