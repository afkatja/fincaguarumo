import { defineField, defineType } from "sanity"
import { isUniqueOtherThanLanguage } from "../../lib/utils"

export const tourType = defineType({
  name: "tour",
  title: "Tours",
  type: "document",
  fields: [
    defineField({
      name: "language",
      type: "string",
      readOnly: true,
      hidden: true,
    }),
    defineField({
      name: "title",
      type: "string",
    }),
    defineField({
      name: "isFeatured",
      type: "boolean",
    }),
    defineField({
      name: "isNew",
      type: "boolean",
    }),
    defineField({
      name: "description",
      type: "string",
    }),
    defineField({
      name: "dateAdded",
      type: "string",
    }),
    defineField({
      name: "price",
      type: "string",
    }),
    defineField({
      name: "location",
      type: "string",
    }),
    defineField({
      name: "duration",
      type: "string",
    }),
    defineField({
      name: "slug",
      type: "slug",
      options: {
        source: "title",
        maxLength: 96,
        isUnique: isUniqueOtherThanLanguage,
      },
      validation: rule =>
        rule
          .required()
          .error("A slug is required to generate a page on the website"),
    }),
    defineField({
      name: "mainImage",
      type: "image",
      options: {
        hotspot: true,
      },
      fields: [
        {
          name: "alt",
          type: "string",
          title: "Alternative text",
        },
      ],
    }),
    defineField({
      name: "slideshow",
      type: "reference",
      to: [{ type: "gallery" }],
    }),
    defineField({
      name: "body",
      type: "blockContent",
    }),
  ],
  preview: {
    select: {
      title: "title",
      description: "description",
      media: "mainImage",
    },
    prepare(selection) {
      return { ...selection }
    },
  },
})
