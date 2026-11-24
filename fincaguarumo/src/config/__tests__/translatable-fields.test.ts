import {
  FIELDS_CONFIG,
  getCopyAsIsFields,
  getTranslatableFields,
  type TranslatableDocType,
} from "../translatable-fields"

describe("translatable-fields", () => {
  describe("getTranslatableFields", () => {
    it("returns a string[] for known document types", () => {
      expect(Array.isArray(getTranslatableFields("page"))).toBe(true)
      expect(getTranslatableFields("page")).toContain("title")
      expect(getTranslatableFields("page")).toContain("body")
    })

    it("returns an empty array for unknown document types", () => {
      expect(getTranslatableFields("unknownType")).toEqual([])
    })
  })

  describe("getCopyAsIsFields", () => {
    it("preserves the string[] contract", () => {
      expect(Array.isArray(getCopyAsIsFields("page"))).toBe(true)
      expect(getCopyAsIsFields("page").every((f) => typeof f === "string")).toBe(true)
    })

    it("returns an empty result for unknown document types", () => {
      expect(getCopyAsIsFields("unknownType")).toEqual([])
    })

    it("excludes translatable fields and underscore-prefixed fields", () => {
      const types = Object.keys(FIELDS_CONFIG) as TranslatableDocType[]
      types.forEach((type) => {
        const translatable = new Set(getTranslatableFields(type))
        const copyAsIs = getCopyAsIsFields(type)

        copyAsIs.forEach((field) => {
          expect(translatable.has(field)).toBe(false)
          expect(field.startsWith("_")).toBe(false)
        })
      })
    })

    it("includes required copy fields for each known type", () => {
      expect(getCopyAsIsFields("page")).toContain("slug")
      expect(getCopyAsIsFields("page")).toContain("mainImage")
      expect(getCopyAsIsFields("accommodation")).toContain("slug")
    })
  })
})
