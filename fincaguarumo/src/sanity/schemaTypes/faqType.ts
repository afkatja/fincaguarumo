import { defineField, defineType } from "sanity"
import { isUniqueOtherThanLanguage } from "../../lib/utils"

export const faqType = defineType({
  name: "faq",
  title: "FAQ",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      description: "Internal title for reference (not displayed on site)",
      validation: Rule => Rule.required().max(100),
    }),
    defineField({
      name: "language",
      type: "string",
      readOnly: true,
      hidden: true,
    }),
    defineField({
      name: "category",
      title: "FAQ Category",
      type: "reference",
      to: { type: "faqCategory" },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: "question",
      title: "Question",
      type: "string",
      validation: Rule => Rule.required().max(200),
    }),
    defineField({
      name: "answerFormat",
      title: "Answer format",
      type: "string",
      initialValue: "text",
      options: {
        list: [
          { title: "Plain text", value: "text" },
          { title: "Rich text", value: "blockContent" },
        ],
        layout: "radio",
      },
    }),
    defineField({
      name: "answer",
      title: "Plain text answer",
      type: "text",
      rows: 4,
      hidden: ({ parent }) => parent?.answerFormat === "blockContent",
      validation: Rule => Rule.max(500),
    }),
    defineField({
      name: "answerBlockContent",
      title: "Rich text answer",
      type: "blockContent",
      hidden: ({ parent }) => parent?.answerFormat !== "blockContent",
    }),
    defineField({
      name: "keywords",
      title: "SEO Keywords",
      type: "array",
      of: [{ type: "string" }],
      description: "Keywords for SEO (e.g., off-grid, Costa Rica, electricity)",
      options: {
        layout: "tags",
      },
    }),
    defineField({
      name: "lastModified",
      title: "Last Modified",
      type: "datetime",
      description: "When this FAQ was last updated",
      initialValue: new Date().toISOString(),
    }),
    defineField({
      name: "displayOrder",
      title: "Display Order",
      type: "number",
      description: "Lower numbers appear first",
    }),
    defineField({
      name: "showOnVillaBruno",
      title: "Show on Villa Bruno page?",
      type: "boolean",
      description: "Include this FAQ on the main Villa Bruno page",
      initialValue: false,
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "question",
        maxLength: 96,
        isUnique: isUniqueOtherThanLanguage,
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: "priority",
      title: "Priority",
      type: "number",
      description: "Higher numbers appear first in search results",
      initialValue: 1,
    }),
    defineField({
      name: "relatedQuestions",
      title: "Related Questions",
      type: "array",
      of: [{ type: "reference", to: { type: "faq" } }],
      description: "Other FAQs that might be relevant",
    }),
    defineField({
      name: "intent",
      title: "User Intent",
      type: "string",
      options: {
        list: [
          { title: "Booking", value: "booking" },
          { title: "Pricing", value: "pricing" },
          { title: "Payment", value: "payment" },
          { title: "Cancellation", value: "cancellation" },
          { title: "Amenities", value: "amenities" },
          { title: "Logistics", value: "logistics" },
          { title: "Property Info", value: "property_info" },
          { title: "Local Area", value: "local_area" },
          { title: "General", value: "general" },
        ],
      },
      description: "Primary intent category for this FAQ",
    }),
  ],
  validation: Rule =>
    Rule.custom(faq => {
      const hasPlainAnswer =
        typeof faq?.answer === "string" && faq.answer.trim().length > 0
      const hasRichAnswer =
        Array.isArray(faq?.answerBlockContent) &&
        faq.answerBlockContent.length > 0

      return hasPlainAnswer || hasRichAnswer
        ? true
        : "Add either a plain text answer or a rich text answer"
    }),
  preview: {
    select: {
      title: "question",
      subtitle: "faqCategory",
    },
  },
  orderings: [
    {
      title: "Display Order",
      name: "displayOrderAsc",
      by: [{ field: "displayOrder", direction: "asc" }],
    },
    {
      title: "Category",
      name: "categoryAsc",
      by: [{ field: "faqCategory", direction: "asc" }],
    },
  ],
})
