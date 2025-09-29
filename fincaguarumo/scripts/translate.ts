import fs from "fs/promises"
import path from "path"
import { translate } from "@vitalets/google-translate-api"
import { HttpProxyAgent } from "http-proxy-agent"

import { languages } from "../src/config"

type Lang = (typeof languages)[number]
const agent = new HttpProxyAgent("http://66.29.154.103:3128") //("http://97.74.87.226:80")

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function autoTranslate(
  text: string,
  target: Lang
): Promise<string | null> {
  try {
    const res = await translate(text, {
      to: target.value,
      fetchOptions: { agent },
    })
    await sleep(500)
    console.log("translated", res.text)

    return res.text
  } catch (err) {
    console.log("error auto translating", err)

    return null // `__MISSING_${target.value.toUpperCase()}__`
  }
}

/**
 * Recursively sync translations
 */
async function syncObject(
  enObj: Record<string, any>,
  langObj: Record<string, any>,
  lang: Lang
): Promise<[Record<string, any>, boolean]> {
  let updated = false

  for (const [key, value] of Object.entries(enObj)) {
    if (typeof value === "string") {
      if (!(key in langObj) || value === null || langObj[key] === null) {
        langObj[key] = await autoTranslate(value, lang)
        updated = true
      }
    } else if (typeof value === "object" && value !== null) {
      if (!(key in langObj)) {
        langObj[key] = {}
        updated = true
      }
      const [nested, nestedUpdated] = await syncObject(
        value,
        langObj[key],
        lang
      )
      langObj[key] = nested
      if (nestedUpdated) updated = true
    }
  }

  return [langObj, updated]
}

async function syncTranslations(): Promise<void> {
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

    const [synced, updated] = await syncObject(enData, data, lang)

    if (updated) {
      await fs.writeFile(filePath, JSON.stringify(synced, null, 2) + "\n")
      console.log(`✅ Updated translations for ${lang.value}.json`)
    }
  }
}

if (require.main === module) {
  syncTranslations().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
