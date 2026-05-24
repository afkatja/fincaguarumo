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
      name: "answer",
      title: "Answer",
      type: "text",
      rows: 4,
      validation: Rule => Rule.required().max(500),
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
