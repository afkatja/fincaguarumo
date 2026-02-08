import { defineType, defineField } from "sanity"

export const imageType = defineType({
  name: "imageWithMetadata",
  title: "Image",
  type: "image",
  options: {
    hotspot: {
      previews: [
        { title: "16:9", aspectRatio: 16 / 9 },
        { title: "4:5", aspectRatio: 4 / 5 },
        { title: "9:16", aspectRatio: 9 / 16 },
      ],
    },
  },
  fields: [
    defineField({
      name: "alt",
      type: "string",
      title: "Alternative text",
      description: "Descriptive text for accessibility and SEO",
    }),
    defineField({
      name: "author",
      type: "string",
      title: "Author",
      description: "Optional: Image author/photographer name",
    }),
    defineField({
      name: "caption",
      type: "string",
      title: "Caption",
      description: "Optional: Image caption",
    }),
    defineField({
      name: "sourceUrl",
      type: "url",
      title: "Source URL",
      description: "Optional: Attribution/source URL where the image was obtained",
    }),
  ],
})
