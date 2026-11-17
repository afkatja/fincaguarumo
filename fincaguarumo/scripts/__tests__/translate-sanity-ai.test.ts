jest.mock("next-sanity", () => ({
  createClient: jest.fn(),
}))

jest.mock("@/sanity/lib/translateText")
jest.mock("@/sanity/lib/portableTextHelper")
jest.mock("@/config/translatable-fields", () => ({
  TRANSLATABLE_FIELDS: {
    faq: ["question", "answer"],
    page: ["title", "subtitle", "description", "body"],
    post: ["title", "body"],
    tour: ["title", "description", "body"],
    home: ["title", "hero_title", "hero_slogan", "hero_body", "subtitle", "description", "intro_body", "featured_content_title", "featured_blog_title"],
    activityBlock: ["title", "subtitle", "description"],
    whyChooseVillaBruno: ["title", "subtitle", "description"],
    locationPage: ["title", "subtitle", "description", "body"],
    accommodation: ["title", "subtitle", "description", "summary", "body", "highlightFeatures"],
  },
  COPY_AS_IS_FIELDS: {
    faq: ["category", "keywords", "showOnVillaBruno", "priority", "relatedQuestions"],
    page: ["slug", "mainImage", "slideshow", "categories", "faq", "isPublished", "showFAQ"],
    post: ["slug", "author", "mainImage", "categories", "publishedAt", "openGraph"],
    tour: ["slug", "mainImage", "slideshow", "body", "geo", "duration"],
    home: ["slug", "mainImage", "background_media", "background_media_poster", "locationDetails", "isPublished", "showBookingOptions", "showBookingDialog", "showFAQ", "featured_content_title", "featured_blog_title"],
    activityBlock: ["slug", "mainImage", "isPublished", "displayOrder", "activities", "seoKeywords"],
    whyChooseVillaBruno: ["slug", "mainImage", "isPublished", "displayOrder", "comparisonTable", "keyDifferentiators", "idealFor", "lessSuitableFor", "seoKeywords"],
    locationPage: ["slug", "mainImage", "background_media"],
    accommodation: ["slug", "mainImage", "slideshow", "categories", "amenities", "pricingRules", "paymentMethods", "cancellationPolicy", "logistics", "checkInTime", "checkOutTime", "capacity", "bedrooms", "bathrooms", "propertyType", "location", "highlightFeatures", "isPublished", "showBookingOptions", "showFAQ"],
  },
}))
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

    it("should translate Portable Text fields", async () => {
      // Use the format expected by the shared isPortableText helper (_type === "block")
      const portableTextValue: Array<{ _type: string; _key: string; children: Array<{ _type: string; _key: string; text: string; marks: string[] }> }> = [
        { _type: "block", _key: "block1", children: [{ _type: "span", _key: "span1", text: "Hello world", marks: [] }] },
      ]

      mockIsPortableText.mockReturnValue(true)
      mockPortableTextToPlain.mockReturnValue("Hello world")
      mockTranslateWithRetry.mockResolvedValue({ translatedText: "Hola mundo", provider: "google-cloud" })
      mockPlainToPortableText.mockReturnValue([{ _type: "block", children: [{ _type: "span", text: "Hola mundo" }] }])

      const result = await translateFieldValue(portableTextValue, "en", "es", mockOptions)

      expect(mockIsPortableText).toHaveBeenCalledWith(portableTextValue)
      expect(mockPortableTextToPlain).toHaveBeenCalledWith(portableTextValue)
      expect(mockTranslateWithRetry).toHaveBeenCalledWith("Hello world", "en", "es", mockOptions)
      expect(mockPlainToPortableText).toHaveBeenCalled()
      expect(result[0].children[0].text).toBe("Hola mundo")
    })

    it("should copy empty Portable Text as-is", async () => {
      const portableTextValue: any[] = []

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

    it("should handle translation errors and return original value", async () => {
      mockIsPortableText.mockReturnValue(false)
      mockTranslateWithRetry.mockRejectedValueOnce(new Error("Translation failed"))

      const result = await translateFieldValue("Hello", "en", "es", mockOptions)

      expect(result).toBe("Hello")
    })
  })

  describe("Configuration", () => {
    it("should have correct translatable types", () => {
      const { TRANSLATABLE_FIELDS } = require("@/config/translatable-fields")
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

    it("should have copy-as-is fields for each type", () => {
      const { COPY_AS_IS_FIELDS } = require("@/config/translatable-fields")

      expect(COPY_AS_IS_FIELDS).toHaveProperty("page")
      expect(COPY_AS_IS_FIELDS.page).toContain("slug")
      expect(COPY_AS_IS_FIELDS.page).toContain("mainImage")
    })
  })
})