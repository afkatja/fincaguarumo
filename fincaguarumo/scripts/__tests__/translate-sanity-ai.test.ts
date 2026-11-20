jest.mock("next-sanity", () => ({
  createClient: jest.fn(),
}))

jest.mock("@/sanity/lib/translateText")
jest.mock("@/sanity/lib/portableTextHelper")
jest.mock("@/config", () => ({
  languages: [
    { value: "en", title: "English", isDefault: true },
    { value: "nl", title: "Nederlands" },
    { value: "ru", title: "Русский" },
    { value: "es", title: "Español" },
    { value: "de", title: "Deutsch" },
  ],
}))

import { translateFieldValue } from "../translate-sanity-ai"
import {
  FIELDS_CONFIG,
  TRANSLATABLE_FIELDS,
  COPY_AS_IS_FIELDS,
} from "@/config/translatable-fields"
import { translateWithRetry } from "@/sanity/lib/translateText"
import { isPortableText, portableTextToPlain, plainToPortableText } from "@/sanity/lib/portableTextHelper"

const mockTranslateWithRetry = translateWithRetry as jest.Mock
const mockIsPortableText = isPortableText as jest.Mock
const mockPortableTextToPlain = portableTextToPlain as jest.Mock
const mockPlainToPortableText = plainToPortableText as jest.Mock

const mockOptions = {
  provider: "google-cloud" as const,
  googleCloudApiKey: "test-key",
  maxRetries: 1,
  baseDelayMs: 10,
}

describe("translate-sanity-ai CLI script", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default mock implementations
    mockIsPortableText.mockReturnValue(false)
    mockTranslateWithRetry.mockResolvedValue({ translatedText: "Hola mundo", provider: "google-cloud" })
    mockPortableTextToPlain.mockReturnValue("Hello world")
    mockPlainToPortableText.mockReturnValue([{ _type: "block", children: [{ _type: "span", text: "Hola mundo" }] }])
  })

  describe("translateFieldValue", () => {
    it("should return null/undefined values as-is", async () => {
      expect(await translateFieldValue(null, "en", "es", mockOptions)).toBeNull()
      expect(await translateFieldValue(undefined, "en", "es", mockOptions)).toBeUndefined()
    })

    it("should translate Portable Text fields preserving structure", async () => {
      const portableTextValue: Array<{ _type: string; _key: string; children: Array<{ _type: string; _key: string; text: string; marks: string[] }> }> = [
        { _type: "block", _key: "block1", children: [{ _type: "span", _key: "span1", text: "Hello world", marks: [] }] },
      ]

      mockIsPortableText.mockReturnValue(true)
      mockTranslateWithRetry.mockResolvedValue({ translatedText: "Hola mundo", provider: "google-cloud" })

      const result = await translateFieldValue(portableTextValue, "en", "es", mockOptions)

      expect(mockIsPortableText).toHaveBeenCalledWith(portableTextValue)
      expect(mockTranslateWithRetry).toHaveBeenCalledWith("Hello world", "en", "es", mockOptions)
      const translated = result as unknown[]
      expect(
        (translated[0] as { children: Array<{ text: string }> }).children[0]
          .text,
      ).toBe("Hola mundo")
    })

    it("should copy a single empty Portable Text block as-is without translating", async () => {
      const portableTextValue: Array<{ _type: string; _key: string; children: Array<{ _type: string; _key: string; text: string; marks: string[] }> }> = [
        { _type: "block", _key: "block1", children: [{ _type: "span", _key: "span1", text: "", marks: [] }] },
      ]

      mockIsPortableText.mockReturnValue(true)

      const result = await translateFieldValue(portableTextValue, "en", "es", mockOptions)

      expect(mockTranslateWithRetry).not.toHaveBeenCalled()
      expect(result).toEqual(portableTextValue)
    })

    it("should copy empty Portable Text as-is", async () => {
      const portableTextValue: never[] = []

      mockIsPortableText.mockReturnValue(false) // Empty array returns false

      const result = await translateFieldValue(portableTextValue, "en", "es", mockOptions)

      expect(result).toEqual(portableTextValue)
      expect(mockTranslateWithRetry).not.toHaveBeenCalled()
    })

    it("should translate string fields", async () => {
      mockTranslateWithRetry.mockResolvedValue({ translatedText: "Hola mundo", provider: "google-cloud" })

      const result = await translateFieldValue("Hello world", "en", "es", mockOptions)

      expect(mockTranslateWithRetry).toHaveBeenCalledWith("Hello world", "en", "es", mockOptions)
      expect(result).toBe("Hola mundo")
    })

    it("should return empty strings as-is", async () => {
      const result = await translateFieldValue("", "en", "es", mockOptions)
      expect(result).toBe("")
      expect(mockTranslateWithRetry).not.toHaveBeenCalled()
    })

    it("should translate array of strings", async () => {
      mockTranslateWithRetry
        .mockResolvedValueOnce({ translatedText: "Uno", provider: "google-cloud" })
        .mockResolvedValueOnce({ translatedText: "Dos", provider: "google-cloud" })

      const result = await translateFieldValue(["One", "Two"], "en", "es", mockOptions)

      expect(result).toEqual(["Uno", "Dos"])
      expect(mockTranslateWithRetry).toHaveBeenCalledTimes(2)
    })

    it("should translate array of objects with string values", async () => {
      mockTranslateWithRetry
        .mockResolvedValueOnce({ translatedText: "Título traducido", provider: "google-cloud" })
        .mockResolvedValueOnce({ translatedText: "Descripción traducida", provider: "google-cloud" })
        .mockResolvedValueOnce({ translatedText: "Título traducido", provider: "google-cloud" })
        .mockResolvedValueOnce({ translatedText: "Descripción traducida", provider: "google-cloud" })

      const input = [
        { title: "Title", description: "Description" },
        { title: "Another", description: "Another desc" },
      ]

      const result = await translateFieldValue(input, "en", "es", mockOptions)

      expect(result).toEqual([
        { title: "Título traducido", description: "Descripción traducida" },
        { title: "Título traducido", description: "Descripción traducida" },
      ])
    })

    it("should handle mixed array elements", async () => {
      mockTranslateWithRetry.mockResolvedValue({ translatedText: "Traducido", provider: "google-cloud" })

      const input = ["string", { title: "Title" }, 123, null]

      const result = await translateFieldValue(input, "en", "es", mockOptions)

      expect(result).toEqual(["Traducido", { title: "Traducido" }, 123, null])
    })

    it("should return non-string, non-array, non-portable-text values as-is", async () => {
      expect(await translateFieldValue(123, "en", "es", mockOptions)).toBe(123)
      expect(await translateFieldValue(true, "en", "es", mockOptions)).toBe(true)
      expect(await translateFieldValue({ key: "value" }, "en", "es", mockOptions)).toEqual({ key: "value" })
    })

    it("should propagate translation errors so the caller can omit the field", async () => {
      mockIsPortableText.mockReturnValue(false)
      mockTranslateWithRetry.mockRejectedValueOnce(new Error("Translation failed"))

      await expect(
        translateFieldValue("Hello", "en", "es", mockOptions),
      ).rejects.toThrow("Translation failed")
    })
  })

  describe("Configuration", () => {
    it("should have correct translatable types", () => {
      const expectedTypes = [
        "faq",
        "page",
        "post",
        "tour",
        "home",
        "activityBlock",
        "whyChooseVillaBruno",
        "locationPage",
        "accommodation",
      ]

      expectedTypes.forEach(type => {
        expect(TRANSLATABLE_FIELDS).toHaveProperty(type)
        expect(Array.isArray(TRANSLATABLE_FIELDS[type])).toBe(true)
      })
    })

    it("should have copy-as-is fields for each type and exclude translatable fields", () => {
      expect(COPY_AS_IS_FIELDS).toHaveProperty("page")
      expect(COPY_AS_IS_FIELDS.page).toContain("slug")
      expect(COPY_AS_IS_FIELDS.page).toContain("mainImage")

      Object.keys(FIELDS_CONFIG).forEach(type => {
        const translatable = new Set(TRANSLATABLE_FIELDS[type] ?? [])
        const copyAsIs = new Set(COPY_AS_IS_FIELDS[type] ?? [])
        copyAsIs.forEach(field => {
          expect(translatable.has(field)).toBe(false)
        })
      })
    })
  })
})