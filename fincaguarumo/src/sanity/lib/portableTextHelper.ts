import { PortableTextBlock } from "@portabletext/types"

/**
 * Extract plain text from Portable Text blocks
 */
export function portableTextToPlain(blocks: PortableTextBlock[]): string {
  if (!blocks || !Array.isArray(blocks)) return ""

  return blocks
    .map(block => {
      if (block._type !== "block" || !block.children) {
        return ""
      }
      return block.children.map((child: any) => child.text || "").join("")
    })
    .join("\n\n")
}

/**
 * Generate a random key for Sanity
 */
function generateKey(): string {
  return Math.random().toString(36).substring(2, 15)
}

/**
 * Reconstruct Portable Text blocks with translated text
 * Preserves structure but replaces text content
 */
export function plainToPortableText(
  originalBlocks: PortableTextBlock[],
  translatedText: string
): PortableTextBlock[] {
  if (!originalBlocks || !Array.isArray(originalBlocks)) return []

  // Split translated text back into paragraphs
  const paragraphs = translatedText.split("\n\n").filter(p => p.trim())

  // Map each paragraph to a block, preserving original structure
  return originalBlocks.map((block, index) => {
    if (block._type !== "block" || !block.children) {
      return block
    }

    const translatedParagraph = paragraphs[index] || ""

    return {
      ...block,
      children: [
        {
          _key: generateKey(),
          _type: "span",
          text: translatedParagraph,
          marks: [], // Reset marks for simplicity
        },
      ],
    }
  })
}

/**
 * Check if a field is Portable Text
 */
export function isPortableText(value: any): boolean {
  return Array.isArray(value) && value.length > 0 && value[0]._type === "block"
}
