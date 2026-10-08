import fs from "fs/promises"
import path from "path"
import { languages } from "../src/config.js"

type Lang = (typeof languages)[number]

/**
 * Check if translations need updating by comparing en.json with other languages
 * Returns true if any language is missing keys from en.json
 */
async function checkTranslations(): Promise<boolean> {
  const localesDir = path.join(process.cwd(), "src", "messages")
  const enPath = path.join(localesDir, "en.json")

  const enData = JSON.parse(await fs.readFile(enPath, "utf-8"))

  let needsUpdate = false
  const missingKeys: Record<string, string[]> = {}

  for (const lang of languages) {
    if (lang.value === "en") continue

    const filePath = path.join(localesDir, `${lang.value}.json`)
    let data: Record<string, any> = {}

    try {
      data = JSON.parse(await fs.readFile(filePath, "utf-8"))
    } catch {
      data = {}
    }

    const missing = findMissingKeys(enData, data)
    if (missing.length > 0) {
      missingKeys[lang.value] = missing
      needsUpdate = true
    }
  }

  if (needsUpdate) {
    console.log("📋 Missing translations found:")
    for (const [lang, keys] of Object.entries(missingKeys)) {
      console.log(`  ${lang}: ${keys.length} keys missing`)
      if (keys.length <= 10) {
        console.log(`    ${keys.join(", ")}`)
      } else {
        console.log(`    ${keys.slice(0, 10).join(", ")}... and ${keys.length - 10} more`)
      }
    }
  } else {
    console.log("✅ All translations up to date")
  }

  return needsUpdate
}

function findMissingKeys(enObj: Record<string, any>, langObj: Record<string, any>, prefix = ""): string[] {
  const missing: string[] = []

  for (const [key, value] of Object.entries(enObj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (typeof value === "string") {
      if (!(key in langObj) || langObj[key] === null || langObj[key] === undefined) {
        missing.push(fullKey)
      }
    } else if (typeof value === "object" && value !== null) {
      if (!(key in langObj) || typeof langObj[key] !== "object") {
        // Entire object missing
        collectAllKeys(value, fullKey, missing)
      } else {
        missing.push(...findMissingKeys(value, langObj[key], fullKey))
      }
    }
  }

  return missing
}

function collectAllKeys(obj: Record<string, any>, prefix: string, result: string[]): void {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === "string") {
      result.push(fullKey)
    } else if (typeof value === "object" && value !== null) {
      collectAllKeys(value, fullKey, result)
    }
  }
}

import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)

if (process.argv[1] === __filename) {
  checkTranslations()
    .then(needsUpdate => {
      process.exit(needsUpdate ? 1 : 0)
    })
    .catch(err => {
      console.error(err)
      process.exit(1)
    })
}