import { defineField, defineType } from "sanity"

export const galleryType = defineType({
  name: "gallery",
  type: "document",
  fields: [
    defineField({
      name: "title",
      type: "string",
    }),
    defineField({
      name: "categories",
      type: "array",
      of: [{ type: "reference", to: { type: "category" } }],
    }),
    defineField({
      name: "images",
      type: "array",
      of: [
        {
          type: "image",
          options: {
            hotspot: true,
          },
        },
      ],
      options: {
        layout: "grid",
      },
      validation: rule => rule.max(12),
    }),
  ],
})
