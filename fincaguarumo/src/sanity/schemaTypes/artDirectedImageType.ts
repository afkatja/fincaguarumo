import { defineType, defineField } from "sanity"

export const artDirectedImageType = defineType({
  name: "artDirectedImage",
  title: "Art-directed image",
  type: "object",
  description:
    "Optional different crops per breakpoint. Desktop is required; tablet and mobile fall back to desktop if empty.",
  fields: [
    defineField({
      name: "desktop",
      type: "imageWithMetadata",
      title: "Desktop (default)",
      description: "Primary image for desktop/large screens",
      validation: rule => rule.required(),
    }),
    defineField({
      name: "tablet",
      type: "imageWithMetadata",
      title: "Tablet (optional)",
      description: "Optional crop for tablet - falls back to desktop if empty",
    }),
    defineField({
      name: "mobile",
      type: "imageWithMetadata",
      title: "Mobile (optional)",
      description:
        "Optional crop for mobile - falls back to tablet/desktop if empty",
    }),
  ],
})
