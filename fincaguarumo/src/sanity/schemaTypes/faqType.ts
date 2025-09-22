import { defineField, defineType } from "sanity"

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
      name: "category",
      title: "FAQ Category",
      type: "string",
      options: {
        list: [
          { title: "Power & Connectivity", value: "power" },
          { title: "Location & Access", value: "location" },
          { title: "Wildlife & Safety", value: "wildlife" },
          { title: "Amenities & Comfort", value: "amenities" },
          { title: "Weather & Seasons", value: "weather" },
        ],
      },
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
      },
      validation: Rule => Rule.required(),
    }),
  ],
  preview: {
    select: {
      title: "question",
      subtitle: "category",
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
      by: [{ field: "category", direction: "asc" }],
    },
  ],
})
