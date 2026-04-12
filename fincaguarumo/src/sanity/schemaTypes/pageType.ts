import { defineField, defineType } from "sanity"
import { isUniqueOtherThanLanguage } from "../../lib/utils"

export const pageType = defineType({
  name: "page",
  title: "Page",
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
      name: "subtitle",
      type: "string",
    }),
    defineField({
      name: "description",
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
      type: "imageWithMetadata",
    }),
    defineField({
      name: "slideshow",
      type: "reference",
      to: [{ type: "gallery" }],
    }),
    defineField({
      name: "categories",
      type: "array",
      of: [{ type: "reference", to: { type: "category" } }],
    }),
    defineField({
      name: "body",
      type: "blockContent",
    }),
    defineField({
      name: "isPublished",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "showFAQ",
      type: "boolean",
      title: "Show FAQ",
      description: "Enable to display FAQ section on this page",
      initialValue: false,
    }),
    defineField({
      name: "faq",
      type: "array",
      of: [{ type: "reference", to: { type: "faq" } }],
      validation: rule =>
        rule.custom((faqs, context) => {
          const showFAQ = context.document?.showFAQ
          if (
            showFAQ &&
            (!faqs || (Array.isArray(faqs) && faqs.length === 0))
          ) {
            return "Please select an FAQ when 'Show FAQ' is enabled"
          }
          return true
        }),
      hidden: ({ document }) => !document?.showFAQ,
    }),

    defineField({
      name: "displayReviews",
      type: "boolean",
      title: "Display featured reviews",
      description: "Enable to display featured reviews on this page",
      initialValue: false,
    }),
  ],
  initialValue: {
    isPublished: true,
  },
  preview: {
    select: {
      title: "title",
      subtitle: "subtitle",
      description: "description",
      media: "mainImage",
    },
    prepare(selection) {
      return { ...selection }
    },
  },
})
