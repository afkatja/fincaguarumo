/**
 * Multilingual Text Preprocessing for Semantic RAG
 *
 * Provides language-specific text preprocessing for consistent embedding quality
 * across supported languages: en, nl, es, ru, de
 */

import { locales } from "../../config"

export type SupportedLanguage = (typeof locales)[number]

export interface PreprocessingOptions {
  normalizeWhitespace?: boolean
  removeSpecialChars?: boolean
  lowercase?: boolean
  removeStopWords?: boolean
  minLength?: number
  maxLength?: number
}

export interface PreprocessingResult {
  processedText: string
  originalLanguage: SupportedLanguage | "unknown" | "auto"
  detectedLanguage?: SupportedLanguage | "unknown"
  preprocessingSteps: string[]
}

// Lazy-loaded language patterns to reduce initial memory footprint
const stopWordsCache = new Map<SupportedLanguage, Set<string>>()
const languagePatternsCache = new Map<
  SupportedLanguage,
  Array<[RegExp, string]>
>()

// Function to get stop words for a language (lazy-loaded)
function getStopWords(language: SupportedLanguage): Set<string> {
  if (!stopWordsCache.has(language)) {
    const words = createStopWordsForLanguage(language)
    stopWordsCache.set(language, words)
  }
  return stopWordsCache.get(language)!
}

// Function to get language patterns (lazy-loaded)
function getLanguagePatterns(
  language: SupportedLanguage,
): Array<[RegExp, string]> {
  if (!languagePatternsCache.has(language)) {
    const patterns = LANGUAGE_PATTERNS[language]
    languagePatternsCache.set(language, patterns)
  }
  return languagePatternsCache.get(language)!
}

// Factory functions for language-specific data
function createStopWordsForLanguage(language: SupportedLanguage): Set<string> {
  switch (language) {
    case "en":
      return new Set([
        "the",
        "be",
        "to",
        "of",
        "and",
        "a",
        "in",
        "that",
        "have",
        "i",
        "it",
        "for",
        "not",
        "on",
        "with",
        "he",
        "as",
        "you",
        "do",
        "at",
        "this",
        "but",
        "his",
        "by",
        "from",
        "they",
        "we",
        "say",
        "her",
        "she",
        "or",
        "an",
        "will",
        "my",
        "one",
        "all",
        "would",
        "there",
        "their",
        "what",
        "so",
        "up",
        "out",
        "if",
        "about",
        "who",
        "get",
        "which",
        "go",
        "me",
        "when",
        "make",
        "can",
        "like",
        "time",
        "no",
        "just",
        "him",
        "know",
        "take",
        "people",
        "into",
        "year",
        "your",
        "good",
        "some",
        "could",
        "them",
        "see",
        "other",
        "than",
        "then",
        "now",
        "look",
        "only",
        "come",
        "its",
        "over",
        "think",
        "also",
        "back",
        "after",
        "use",
        "two",
        "how",
        "our",
        "work",
        "first",
        "well",
        "way",
        "even",
        "new",
        "want",
        "because",
        "any",
        "these",
        "give",
        "day",
        "most",
        "us",
      ])
    case "nl":
      return new Set([
        "de",
        "het",
        "een",
        "van",
        "en",
        "is",
        "in",
        "dat",
        "op",
        "te",
        "voor",
        "met",
        "ik",
        "niet",
        "je",
        "maar",
        "ze",
        "zijn",
        "hij",
        "heeft",
        "hem",
        "dan",
        "zou",
        "of",
        "wat",
        "mijn",
        "men",
        "bij",
        "ons",
        "haar",
        "hun",
        "uit",
        "der",
        "er",
        "mij",
        "naar",
        "aan",
        "hebt",
        "hoe",
        "over",
        "deze",
        "u",
        "zich",
        "me",
        "hier",
        "door",
        "daar",
        "om",
        "iets",
        "mogen",
        "toch",
        "al",
        "waren",
        "veel",
        "meer",
        "doen",
        "toen",
        "moeten",
        "ben",
        "zonder",
        "kan",
        "dus",
        "alles",
        "onder",
        "ja",
        "eens",
        "hierbij",
        "daarom",
        "iemand",
        "niemand",
        "misschien",
        "wellicht",
      ])
    case "es":
      return new Set([
        "el",
        "la",
        "de",
        "que",
        "y",
        "a",
        "en",
        "un",
        "del",
        "los",
        "se",
        "las",
        "por",
        "con",
        "su",
        "para",
        "como",
        "o",
        "fue",
        "si",
        "una",
        "pero",
        "sus",
        "le",
        "al",
        "lo",
        "cuando",
        "más",
        "ni",
        "él",
        "todo",
        "esta",
        "esto",
        "estar",
        "tienen",
        "desde",
        "hasta",
        "tanto",
        "todos",
        "estos",
        "estas",
        "uno",
        "dos",
        "tres",
        "cuatro",
        "cinco",
        "también",
        "muy",
        "sin",
        "sobre",
        "ser",
        "está",
        "son",
        "fueron",
        "fuera",
        "había",
        "habrán",
        "habrían",
        "habiendo",
        "habido",
        "habremos",
        "habríamos",
      ])
    case "ru":
      return new Set([
        "и",
        "в",
        "не",
        "на",
        "что",
        "это",
        "быть",
        "есть",
        "он",
        "она",
        "оно",
        "они",
        "мы",
        "вы",
        "я",
        "ты",
        "как",
        "когда",
        "где",
        "почему",
        "зачем",
        "кто",
        "который",
        "какой",
        "какая",
        "какое",
        "какие",
        "мой",
        "твой",
        "его",
        "её",
        "наш",
        "ваш",
        "их",
        "свой",
        "этот",
        "тот",
        "такой",
        "такая",
        "такое",
        "такие",
        "весь",
        "вся",
        "всё",
        "все",
        "каждый",
        "каждая",
        "каждое",
        "каждые",
        "сам",
        "сама",
        "само",
        "сами",
        "самый",
        "только",
        "лишь",
        "уже",
        "ещё",
        "тоже",
        "также",
        "или",
        "но",
        "а",
        "да",
        "нет",
        "если",
        "хотя",
        "чтобы",
        "потому",
        "поэтому",
        "от",
        "до",
        "для",
        "о",
        "об",
        "со",
        "под",
        "над",
        "перед",
        "между",
        "через",
        "к",
        "без",
        "по",
        "за",
        "у",
        "из",
        "с",
        "обо",
        "относительно",
        "благодаря",
        "несмотря",
        "вместо",
        "кроме",
        "включая",
        "при",
        "посредством",
        "путём",
        "с помощью",
        "в течение",
        "во время",
        "после",
        "среди",
        "внутри",
        "снаружи",
        "вблизи",
        "вдоль",
        "впереди",
        "позади",
        "наверху",
        "внизу",
        "слева",
        "справа",
        "здесь",
        "там",
        "туда",
        "сюда",
        "оттуда",
        "отсюда",
        "где-то",
        "куда-то",
        "когда-то",
        "как-то",
        "почему-то",
        "зачем-то",
        "кто-то",
        "что-то",
        "какой-то",
        "какая-то",
        "какое-то",
        "какие-то",
        "всегда",
        "никогда",
        "иногда",
        "часто",
        "редко",
        "обычно",
        "вдруг",
        "наконец",
        "сначала",
        "потом",
        "затем",
        "назад",
        "снова",
        "опять",
        "ещё раз",
        "почти",
        "примерно",
        "ровно",
        "именно",
        "как раз",
        "в точности",
        "совершенно",
        "абсолютно",
        "полностью",
        "целиком",
        "весьма",
        "крайне",
        "очень",
        "слишком",
        "достаточно",
        "много",
        "мало",
        "больше",
        "меньше",
        "более",
        "менее",
        "наиболее",
        "наименее",
        "лучше",
        "хуже",
        "хороший",
        "плохой",
        "большой",
        "маленький",
        "новый",
        "старый",
        "первый",
        "последний",
        "другой",
        "иной",
        "любой",
        "всякий",
        "разный",
        "различный",
        "подобный",
        "сходный",
        "похожий",
        "одинаковый",
        "противоположный",
        "чужой",
        "личный",
        "собственный",
        "частный",
        "общий",
        "всесторонний",
        "полный",
        "целый",
        "совсем",
        "вовсе",
        "ни",
        "либо",
        "раз",
        "поскольку",
        "так как",
        "потому что",
        "оттого что",
        "из-за того что",
        "благодаря тому что",
        "несмотря на то что",
        "вместо того чтобы",
        "прежде чем",
        "до того как",
        "после того как",
        "в то время как",
        "между тем как",
        "пока",
        "как только",
        "едва",
        "лишь только",
        "только что",
        "чуть только",
        "едва лишь",
        "не успел",
        "не прошло",
        "в то же время",
        "одновременно",
        "вместе с тем",
        "наряду с этим",
        "кроме того",
        "вдобавок",
        "к тому же",
        "при этом",
        "в этом случае",
        "в таком случае",
        "в любом случае",
        "во всяком случае",
        "в частности",
        "в общем",
        "в целом",
        "в конечном счёте",
        "в результате",
        "итак",
        "следовательно",
        "значит",
        "стало быть",
        "таким образом",
        "в этом отношении",
        "с этой точки зрения",
        "с одной стороны",
        "с другой стороны",
        "между прочим",
        "кстати",
        "к слову сказать",
        "между тем",
        "однако",
        "всё же",
        "всё-таки",
        "тем не менее",
        "несмотря на это",
        "вопреки этому",
        "в отличие от этого",
        "в соответствии с этим",
        "в связи с этим",
        "благодаря этому",
        "вследствие этого",
        "в результате этого",
        "это означает",
        "это говорит о том",
        "это свидетельствует о том",
        "это указывает на то",
        "это доказывает",
        "это подтверждает",
        "это объясняет",
        "это позволяет",
        "это даёт возможность",
        "это создаёт условия",
        "это обеспечивает",
        "это способствует",
        "это приводит к",
        "это вызывает",
        "это порождает",
        "это обуславливает",
        "это обусловливает",
        "это определяет",
        "это влияет на",
        "это сказывается на",
        "это отражается на",
        "это проявляется в",
        "это выражается в",
        "это заключается в",
        "это состоит в",
      ])
    case "de":
      return new Set([
        "der",
        "die",
        "und",
        "in",
        "den",
        "von",
        "zu",
        "das",
        "mit",
        "sich",
        "des",
        "auf",
        "für",
        "ist",
        "im",
        "dem",
        "nicht",
        "ein",
        "eine",
        "als",
        "auch",
        "es",
        "an",
        "werden",
        "aus",
        "er",
        "hat",
        "dass",
        "sie",
        "nach",
        "wird",
        "bei",
        "einer",
        "um",
        "am",
        "sind",
        "noch",
        "wie",
        "einem",
        "über",
        "einen",
        "so",
        "zum",
        "war",
        "haben",
        "nur",
        "oder",
        "aber",
        "vor",
        "zur",
        "bis",
        "mehr",
        "durch",
        "man",
        "sein",
        "wurde",
        "sei",
        "ins",
        "seit",
        "gegen",
        "vom",
        "bereits",
        "sehr",
        "unter",
        "wieder",
        "zwischen",
        "dieses",
        "diesen",
        "dieser",
        "diesem",
      ])
    default:
      return new Set([])
  }
}

/**
 * Language-specific character normalization patterns
 * Each pattern is an array of [regex, replacement] pairs
 */
const LANGUAGE_PATTERNS: Record<SupportedLanguage, Array<[RegExp, string]>> = {
  en: [
    // Normalize common contractions
    [/can't/g, "cannot"],
    [/won't/g, "will not"],
    [/don't/g, "do not"],
    [/doesn't/g, "does not"],
    [/didn't/g, "did not"],
    [/isn't/g, "is not"],
    [/aren't/g, "are not"],
    [/wasn't/g, "was not"],
    [/weren't/g, "were not"],
    // Normalize punctuation
    [/[^\w\s]/g, " "],
    // Normalize whitespace
    [/\s+/g, " "],
  ],
  nl: [
    // Dutch-specific patterns
    [/\b('t|'n|'s)\b/g, " "], // Common Dutch contractions
    [/ij/g, "y"], // Dutch ij digraph
    // Normalize punctuation
    [/[^\w\s]/g, " "],
    // Normalize whitespace
    [/\s+/g, " "],
  ],
  es: [
    // Spanish-specific patterns
    [/[ñ]/g, "n"], // Normalize ñ to n
    [/[ü]/g, "u"], // Normalize ü to u
    // Handle accented characters
    [/[áàäâ]/g, "a"],
    [/[éèëê]/g, "e"],
    [/[íìïî]/g, "i"],
    [/[óòöô]/g, "o"],
    [/[úùüû]/g, "u"],
    // Normalize punctuation
    [/[^\w\s]/g, " "],
    // Normalize whitespace
    [/\s+/g, " "],
  ],
  ru: [
    // Russian-specific patterns
    [/[ë]/g, "å"], // Normalize ë to å
    // Normalize punctuation (Cyrillic-friendly) - preserve Cyrillic letters
    [/[^\w\sа-яёА-ЯЁ]/g, " "],
    // Normalize whitespace
    [/\s+/g, " "],
  ],
  de: [
    // German-specific patterns
    [/[ä]/g, "ae"],
    [/[ö]/g, "oe"],
    [/[ü]/g, "ue"],
    [/[ß]/g, "ss"],
    // Handle umlauts in uppercase
    [/[Ä]/g, "Ae"],
    [/[Ö]/g, "Oe"],
    [/[Ü]/g, "Ue"],
    // Normalize punctuation
    [/[^\w\s]/g, " "],
    // Normalize whitespace
    [/\s+/g, " "],
  ],
}

/**
 * Detect language from text using simple heuristics
 */
export function detectLanguage(text: string): SupportedLanguage | "unknown" {
  const cleanText = text.toLowerCase().replace(/[^\w\s]/g, "")

  // Language-specific character detection
  const hasCyrillic = /[а-яё]/.test(text)
  const hasGermanUmlauts = /[äöüß]/.test(text)
  const hasSpanishAccents = /[ñáéíóúü]/.test(text)
  const hasDutchIJ = /ij/.test(text.toLowerCase())

  // Simple keyword detection for better accuracy
  const keywords = {
    en: ["the", "and", "is", "are", "was", "were"],
    nl: ["de", "het", "een", "van", "en", "is", "zijn"],
    es: ["el", "la", "de", "que", "y", "es", "son", "está"],
    ru: ["и", "в", "не", "на", "что", "это", "быть", "есть"],
    de: ["der", "die", "und", "in", "den", "von", "ist", "sind"],
  }

  // Score each language based on keyword presence
  const scores: Record<SupportedLanguage, number> = {
    en: 0,
    nl: 0,
    es: 0,
    ru: 0,
    de: 0,
  }

  for (const [lang, words] of Object.entries(keywords)) {
    for (const word of words) {
      const regex = new RegExp(`\\b${word}\\b`, "gi")
      const matches = cleanText.match(regex)
      if (matches) {
        scores[lang as SupportedLanguage] += matches.length
      }
    }
  }

  // Apply character-based bonuses
  if (hasCyrillic) scores.ru += 5
  if (hasGermanUmlauts) scores.de += 5
  if (hasSpanishAccents) scores.es += 3
  if (hasDutchIJ) scores.nl += 2

  // Find the language with highest score
  let maxScore = 0
  let detectedLang: SupportedLanguage | "unknown" = "unknown"

  for (const [lang, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score
      detectedLang = lang as SupportedLanguage
    }
  }

  // Return unknown if no clear winner
  return maxScore > 0 ? detectedLang : "unknown"
}

/**
 * Apply language-specific preprocessing to text
 */
export function preprocessText(
  text: string,
  language: SupportedLanguage | "auto" = "auto",
  options: PreprocessingOptions = {},
): PreprocessingResult {
  const {
    normalizeWhitespace = true,
    removeSpecialChars = true,
    lowercase = true,
    removeStopWords = false,
    minLength = 3,
    maxLength = 10000,
  } = options

  const preprocessingSteps: string[] = []
  let processedText = text.trim()

  // Detect language if auto
  let detectedLanguage: SupportedLanguage | "unknown" = language as
    | SupportedLanguage
    | "unknown"
  let originalLanguage: SupportedLanguage | "unknown" = language as
    | SupportedLanguage
    | "unknown"

  if (language === "auto") {
    detectedLanguage = detectLanguage(processedText)
    originalLanguage = detectedLanguage
    preprocessingSteps.push(`Detected language: ${detectedLanguage}`)
  } else {
    preprocessingSteps.push(`Using specified language: ${language}`)
  }

  // Validate and adjust text length
  if (processedText.length < minLength) {
    throw new Error(`Text too short: minimum ${minLength} characters required`)
  }

  if (processedText.length > maxLength) {
    processedText = processedText.substring(0, maxLength)
    preprocessingSteps.push(`Truncated to ${maxLength} characters`)
  }

  // Apply language-specific patterns (contractions first, then other patterns)
  if (detectedLanguage !== "unknown") {
    const patterns = getLanguagePatterns(detectedLanguage as SupportedLanguage)

    // Helper function to check if pattern is a contraction
    const isContractionPattern = (regex: RegExp): boolean => {
      const regexStr = regex.toString()
      return (
        regexStr.includes("can't") ||
        regexStr.includes("won't") ||
        regexStr.includes("don't") ||
        regexStr.includes("n't")
      )
    }

    // Apply contraction patterns first
    patterns
      .filter(([regex]) => isContractionPattern(regex))
      .forEach(([regex, replacement]) => {
        processedText = processedText.replace(regex, replacement)
      })

    // Apply remaining patterns (including punctuation removal)
    patterns
      .filter(([regex]) => !isContractionPattern(regex))
      .forEach(([regex, replacement]) => {
        processedText = processedText.replace(regex, replacement)
      })

    preprocessingSteps.push(`Applied ${detectedLanguage}-specific patterns`)
  }

  // Remove special characters if requested (but only if not already done by language patterns)
  if (removeSpecialChars) {
    // Use Unicode-aware regex for non-Latin languages to preserve their characters
    if (detectedLanguage === "ru") {
      // For Russian, use the same pattern as the Russian-specific preprocessing
      processedText = processedText.replace(/[^\w\s\u0400-\u04FF]/g, " ")
      preprocessingSteps.push(
        "Removed special characters (Unicode-aware for Russian)",
      )
    } else {
      // For Latin-based languages, use the standard ASCII pattern
      processedText = processedText.replace(/[^\w\s]/g, " ")
      preprocessingSteps.push("Removed special characters")
    }
  }

  // Normalize whitespace
  if (normalizeWhitespace) {
    processedText = processedText.replace(/\s+/g, " ").trim()
    preprocessingSteps.push("Normalized whitespace")
  }

  // Convert to lowercase if requested
  if (lowercase) {
    processedText = processedText.toLowerCase()
    preprocessingSteps.push("Converted to lowercase")
  }

  // Remove stop words if requested
  if (removeStopWords && detectedLanguage !== "unknown") {
    const stopWords = getStopWords(detectedLanguage as SupportedLanguage)
    const words = processedText.split(/\s+/)
    const filteredWords = words.filter(word => !stopWords.has(word))
    processedText = filteredWords.join(" ")
    preprocessingSteps.push(`Removed stop words for ${detectedLanguage}`)
  }

  return {
    processedText,
    originalLanguage,
    detectedLanguage,
    preprocessingSteps,
  }
}

/**
 * Validate if language is supported
 */
export function isSupportedLanguage(
  language: string,
): language is SupportedLanguage {
  return ["en", "nl", "es", "ru", "de"].includes(language)
}

// Fallback language mapping for unsupported languages
const FALLBACK_MAP: Record<string, SupportedLanguage> = {
  unknown: "en", // Default to English
  fr: "en", // French -> English
  it: "en", // Italian -> English
  pt: "es", // Portuguese -> Spanish
  ro: "en", // Romanian -> English
  cs: "de", // Czech -> German
  pl: "de", // Polish -> German
  sv: "en", // Swedish -> English
  no: "en", // Norwegian -> English
  da: "de", // Danish -> German
  fi: "en", // Finnish -> English
  hu: "de", // Hungarian -> German
  bg: "ru", // Bulgarian -> Russian
  uk: "ru", // Ukrainian -> Russian
  be: "ru", // Belarusian -> Russian
  hr: "de", // Croatian -> German
  sr: "de", // Serbian -> German
  sl: "de", // Slovenian -> German
  sk: "de", // Slovak -> German
  et: "en", // Estonian -> English
  lv: "de", // Latvian -> German
  lt: "de", // Lithuanian -> German
  mt: "en", // Maltese -> English
  ga: "en", // Irish -> English
  cy: "en", // Welsh -> English
  is: "en", // Icelandic -> English
  mk: "de", // Macedonian -> German
  sq: "en", // Albanian -> English
}

/**
 * Get fallback language for unsupported languages
 */
export function getFallbackLanguage(
  detectedLanguage: string,
): SupportedLanguage {
  return FALLBACK_MAP[detectedLanguage.toLowerCase()] || "en"
}

/**
 * Preprocess text with automatic fallback for unsupported languages
 */
export function preprocessTextWithFallback(
  text: string,
  language: SupportedLanguage | "auto" | string = "auto",
  options: PreprocessingOptions = {},
): PreprocessingResult {
  try {
    // Check if language is supported
    if (
      language !== "auto" &&
      !isSupportedLanguage(language as SupportedLanguage)
    ) {
      console.warn(`Unsupported language ${language}, falling back to English`)
      return preprocessText(text, "en", options)
    }

    return preprocessText(text, language as SupportedLanguage | "auto", options)
  } catch (error) {
    // If preprocessing fails, try with English fallback
    console.warn(
      `Preprocessing failed for language ${language}, falling back to English`,
    )
    return preprocessText(text, "en", options)
  }
}
