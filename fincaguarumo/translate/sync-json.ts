import "dotenv/config"
import fs from "fs/promises"
import path from "path"
import { createHash } from "crypto"
import { languages } from "../src/config.js"
import {
  translateBatch,
  getOptions,
  type LangRef,
  type TranslateOptions,
} from "./core.js"

const LOCALES_DIR = path.join(process.cwd(), "src", "messages")
const EN_PATH = path.join(LOCALES_DIR, "en.json")
const HASHES_PATH = path.join(LOCALES_DIR, ".en-hashes.json")

type Leaf = { key: string; value: string }

/**
 * Yield every leaf string in a nested translation object as a dot-path key.
 */
function* walkLeaves(
  obj: Record<string, unknown>,
  prefix = "",
): Generator<Leaf> {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === "string") {
      yield { key: fullKey, value }
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      yield* walkLeaves(value as Record<string, unknown>, fullKey)
    }
  }
}

function hashValue(value: string): string {
  return createHash("sha1").update(value).digest("hex")
}

function getByPath(obj: Record<string, unknown>, key: string): unknown {
  let current: unknown = obj
  for (const part of key.split(".")) {
    if (current === null || typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function setByPath(obj: Record<string, unknown>, key: string, value: unknown): void {
  const parts = key.split(".")
  let current: Record<string, unknown> = obj
  for (let i = 0; i < parts.length - 1; i += 1) {
    const next = current[parts[i]]
    if (next === null || typeof next !== "object") {
      current[parts[i]] = {}
    }
    current = current[parts[i]] as Record<string, unknown>
  }
  current[parts[parts.length - 1]] = value
}

function deleteByPath(obj: Record<string, unknown>, key: string): void {
  const parts = key.split(".")
  let current: unknown = obj
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (current === null || typeof current !== "object") return
    current = (current as Record<string, unknown>)[parts[i]]
  }
  if (current === null || typeof current !== "object") return
  delete (current as Record<string, unknown>)[parts[parts.length - 1]]
}

function hasByPath(obj: Record<string, unknown>, key: string): boolean {
  let current: unknown = obj
  for (const part of key.split(".")) {
    if (current === null || typeof current !== "object") return false
    current = (current as Record<string, unknown>)[part]
  }
  return true
}

/**
 * Sync src/messages/*.json against src/messages/en.json.
 *
 * - Retranslates keys whose English value changed (tracked via a sidecar hash
 *   file at src/messages/.en-hashes.json) and keys still missing in a locale.
 * - Prunes orphan keys that no longer exist in English.
 * - Translates strings concurrently (DeepL batched in a single request).
 * - Never writes a translation whose placeholders/markup failed the guard.
 */
export async function syncTranslations(
  options: TranslateOptions = getOptions(),
): Promise<void> {
  const enData = JSON.parse(
    await fs.readFile(EN_PATH, "utf-8"),
  ) as Record<string, unknown>
  const enLeaves = Array.from(walkLeaves(enData))
  const enHashes = Object.fromEntries(enLeaves.map((leaf) => [leaf.key, hashValue(leaf.value)]))

  let previousHashes: Record<string, string> = {}
  try {
    previousHashes = JSON.parse(await fs.readFile(HASHES_PATH, "utf-8"))
  } catch {
    // First run: nothing cached yet, translate every missing/changed key.
  }

  const from: LangRef = { code: "en", title: "English" }

  for (const lang of languages) {
    if (lang.value === "en") continue

    const to: LangRef = { code: lang.value, title: lang.title }
    const filePath = path.join(LOCALES_DIR, `${lang.value}.json`)

    let data: Record<string, unknown>
    try {
      data = JSON.parse(await fs.readFile(filePath, "utf-8"))
    } catch {
      data = {}
    }

    const enKeys = new Set(enLeaves.map((leaf) => leaf.key))
    const existingKeys = new Set(
      Array.from(walkLeaves(data)).map((leaf) => leaf.key),
    )

    let updated = false

    // Prune orphan keys removed from English.
    for (const key of existingKeys) {
      if (!enKeys.has(key)) {
        deleteByPath(data, key)
        updated = true
      }
    }

    // Collect leaves to (re)translate: missing in locale or English changed.
    const jobs: Leaf[] = []
    for (const leaf of enLeaves) {
      const changed =
        previousHashes[leaf.key] !== undefined &&
        previousHashes[leaf.key] !== enHashes[leaf.key]
      const missing =
        !hasByPath(data, leaf.key) ||
        typeof getByPath(data, leaf.key) !== "string" ||
        getByPath(data, leaf.key) === ""
      if (missing || changed) {
        jobs.push(leaf)
      }
    }

    if (jobs.length === 0 && !updated) {
      console.log(`✓ ${lang.value} (${lang.title}) already up to date`)
      continue
    }

    console.log(
      `🔄 Syncing ${lang.value} (${lang.title}): ${jobs.length} string(s) to translate${
        updated ? ", plus orphan pruning" : ""
      }...`,
    )

    const translations = await translateBatch(
      jobs.map((job) => job.value),
      from,
      to,
      options,
    )

    for (let i = 0; i < jobs.length; i += 1) {
      const translation = translations[i]
      if (translation !== null && translation !== undefined) {
        setByPath(data, jobs[i].key, translation)
        updated = true
        console.log(
          `  ✓ ${lang.value}: "${jobs[i].value.slice(0, 40)}..." → "${translation.slice(0, 40)}..."`,
        )
      } else {
        console.log(
          `  ✗ ${lang.value}: failed to translate "${jobs[i].value.slice(0, 40)}..."`,
        )
      }
    }

    if (updated) {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n")
      console.log(`✅ Updated ${lang.value}.json`)
    }
  }

  // Persist English hashes so the next run knows which source strings changed.
  await fs.writeFile(HASHES_PATH, JSON.stringify(enHashes, null, 2) + "\n")
}

import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)

if (process.argv[1] === __filename) {
  const provider = process.argv[2] as TranslateOptions["provider"] | undefined
  if (provider) process.env.TRANSLATION_PROVIDER = provider

  syncTranslations().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
