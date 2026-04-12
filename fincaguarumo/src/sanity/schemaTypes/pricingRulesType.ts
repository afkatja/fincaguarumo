import { defineField, defineType } from "sanity"

export const pricingRulesType = defineType({
  name: "pricingRules",
  title: "Pricing Rules",
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
      title: "Title",
      type: "string",
      validation: Rule => Rule.required().max(100),
    }),
    defineField({
      name: "ruleType",
      title: "Rule Type",
      type: "string",
      options: {
        list: [
          { title: "Base Rate", value: "base_rate" },
          { title: "Seasonal Pricing", value: "seasonal" },
          { title: "Discount", value: "discount" },
          { title: "Additional Fee", value: "fee" },
          { title: "Tax", value: "tax" },
        ],
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: "season",
      title: "Season",
      type: "string",
      options: {
        list: [
          { title: "High Season", value: "high" },
          { title: "Low Season", value: "low" },
          { title: "Shoulder Season", value: "shoulder" },
          { title: "All Year", value: "all" },
        ],
      },
      hidden: ({ document }) => (document as any)?.ruleType !== "seasonal",
    }),
    defineField({
      name: "startDate",
      title: "Start Date",
      type: "date",
      hidden: ({ document }) => (document as any)?.ruleType !== "seasonal",
    }),
    defineField({
      name: "endDate",
      title: "End Date",
      type: "date",
      hidden: ({ document }) => (document as any)?.ruleType !== "seasonal",
    }),
    defineField({
      name: "basePrice",
      title: "Base Price (USD)",
      type: "number",
      description: "Base price per person per night",
      validation: Rule => Rule.min(0),
    }),
    defineField({
      name: "percentage",
      title: "Percentage (%)",
      type: "number",
      description: "For discounts and taxes",
      hidden: ({ document }) =>
        !["discount", "tax"].includes((document as any)?.ruleType),
      validation: Rule => Rule.min(-100).max(100),
    }),
    defineField({
      name: "fixedAmount",
      title: "Fixed Amount (USD)",
      type: "number",
      description: "Fixed fee amount",
      hidden: ({ document }) => (document as any)?.ruleType !== "fee",
      validation: Rule => Rule.min(0),
    }),
    defineField({
      name: "minimumNights",
      title: "Minimum Nights",
      type: "number",
      description: "Minimum stay requirement for this rule",
      hidden: ({ document }) => (document as any)?.ruleType !== "discount",
      validation: Rule => Rule.min(1),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      validation: Rule => Rule.required().max(500),
    }),
    defineField({
      name: "isActive",
      title: "Active",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "displayOrder",
      title: "Display Order",
      type: "number",
      description: "Lower numbers appear first",
    }),
  ],
  preview: {
    select: {
      title: "title",
      ruleType: "ruleType",
      season: "season",
    },
    prepare(selection) {
      const { title, ruleType, season } = selection
      return {
        subtitle: `${ruleType}${season ? ` - ${season}` : ""}`,
        ...selection,
      }
    },
  },
  orderings: [
    {
      title: "Display Order",
      name: "displayOrderAsc",
      by: [{ field: "displayOrder", direction: "asc" }],
    },
    {
      title: "Rule Type",
      name: "ruleTypeAsc",
      by: [{ field: "ruleType", direction: "asc" }],
    },
  ],
})
