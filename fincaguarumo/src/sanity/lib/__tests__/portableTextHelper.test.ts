import { portableTextToPlain, plainToPortableText, isPortableText } from "@/sanity/lib/portableTextHelper"

describe("portableTextHelper", () => {
  const mockBlocks = [
    {
      _type: "block",
      _key: "block1",
      children: [
        { _type: "span", _key: "span1", text: "Hello ", marks: [] },
        { _type: "span", _key: "span2", text: "world", marks: ["strong"] },
      ],
    },
    {
      _type: "block",
      _key: "block2",
      children: [
        { _type: "span", _key: "span3", text: "This is a test", marks: [] },
      ],
    },
  ]

  describe("portableTextToPlain", () => {
    it("should extract plain text from Portable Text blocks", () => {
      const result = portableTextToPlain(mockBlocks)
      expect(result).toBe("Hello world\n\nThis is a test")
    })

    it("should handle empty blocks array", () => {
      const result = portableTextToPlain([])
      expect(result).toBe("")
    })

    it("should handle null/undefined input", () => {
      expect(portableTextToPlain(null as any)).toBe("")
      expect(portableTextToPlain(undefined as any)).toBe("")
    })

    it("should handle blocks without children", () => {
      const blocks = [{ _type: "block", _key: "block1", children: [] }]
      const result = portableTextToPlain(blocks)
      expect(result).toBe("")
    })

    it("should handle non-block types gracefully", () => {
      const blocks = [
        { _type: "block", _key: "block1", children: [{ _type: "span", _key: "span1", text: "Hello" }] },
        { _type: "image", _key: "img1" },
      ]
      const result = portableTextToPlain(blocks as any)
      expect(result).toBe("Hello\n\n")
    })
  })

  describe("plainToPortableText", () => {
    it("should reconstruct Portable Text blocks with translated text", () => {
      const translatedText = "Hola mundo\n\nEsto es una prueba"
      const result = plainToPortableText(mockBlocks, translatedText)

      expect(result).toHaveLength(2)
      expect(result[0].children[0].text).toBe("Hola mundo")
      expect(result[1].children[0].text).toBe("Esto es una prueba")
      expect(result[0]._key).toBe(mockBlocks[0]._key) // Block keys preserved
      expect(result[0].children[0]._key).not.toBe(mockBlocks[0].children[0]._key) // New keys generated for children
    })

    it("should handle empty translated text", () => {
      const result = plainToPortableText(mockBlocks, "")
      expect(result).toHaveLength(2)
      expect(result[0].children[0].text).toBe("")
    })

    it("should handle null/undefined input", () => {
      expect(plainToPortableText(null as any, "test")).toEqual([])
      expect(plainToPortableText(undefined as any, "test")).toEqual([])
    })

    it("should preserve block structure but reset marks", () => {
      const translatedText = "Hola mundo\n\nEsto es una prueba"
      const result = plainToPortableText(mockBlocks, translatedText)

      expect(result[0].children[0].marks).toEqual([])
      expect(result[1].children[0].marks).toEqual([])
    })

    it("should handle fewer paragraphs than original blocks", () => {
      const translatedText = "Only one paragraph"
      const result = plainToPortableText(mockBlocks, translatedText)

      expect(result).toHaveLength(2)
      expect(result[0].children[0].text).toBe("Only one paragraph")
      expect(result[1].children[0].text).toBe("") // Second block gets empty string
    })

    it("should handle more paragraphs than original blocks", () => {
      const translatedText = "Para 1\n\nPara 2\n\nPara 3"
      const result = plainToPortableText(mockBlocks, translatedText)

      expect(result).toHaveLength(2) // Still only 2 blocks from original
      expect(result[0].children[0].text).toBe("Para 1")
      expect(result[1].children[0].text).toBe("Para 2")
    })
  })

  describe("isPortableText", () => {
    it("should return true for valid Portable Text array", () => {
      expect(isPortableText(mockBlocks)).toBe(true)
    })

    it("should return false for empty array", () => {
      expect(isPortableText([])).toBe(false)
    })

    it("should return false for non-array input", () => {
      expect(isPortableText("string")).toBe(false)
      expect(isPortableText({})).toBe(false)
      expect(isPortableText(null)).toBe(false)
    })

    it("should return false for array without block type", () => {
      expect(isPortableText([{ _type: "span", text: "test" }])).toBe(false)
    })

    it("should return false for array with non-block first element", () => {
      expect(isPortableText([{ _type: "image" }])).toBe(false)
    })
  })
})