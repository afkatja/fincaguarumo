import { defineField, defineType } from "sanity"

export const cancellationPoliciesType = defineType({
  name: "cancellationPolicies",
  title: "Cancellation Policies",
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
      name: "policyType",
      title: "Policy Type",
      type: "string",
      options: {
        list: [
          { title: "Flexible", value: "flexible" },
          { title: "Moderate", value: "moderate" },
          { title: "Strict", value: "strict" },
          { title: "Super Strict", value: "super_strict" },
        ],
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: "timeframes",
      title: "Cancellation Timeframes",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "daysBeforeCheckIn",
              title: "Days Before Check-in",
              type: "number",
              validation: Rule => Rule.required().min(0),
            }),
            defineField({
              name: "refundPercentage",
              title: "Refund Percentage",
              type: "number",
              validation: Rule => Rule.required().min(0).max(100),
            }),
            defineField({
              name: "description",
              title: "Description",
              type: "string",
              validation: Rule => Rule.required(),
            }),
          ],
        },
      ],
      validation: Rule => Rule.required().min(1),
    }),
    defineField({
      name: "description",
      title: "Policy Description",
      type: "text",
      rows: 4,
      validation: Rule => Rule.required().max(1000),
    }),
    defineField({
      name: "modificationsAllowed",
      title: "Modifications Allowed",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "modificationPolicy",
      title: "Modification Policy",
      type: "text",
      rows: 3,
      description: "Rules for modifying bookings",
      hidden: ({ document }) => !(document as any)?.modificationsAllowed,
    }),
    defineField({
      name: "noShowPolicy",
      title: "No-Show Policy",
      type: "text",
      rows: 2,
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: "exceptions",
      title: "Exceptions",
      type: "array",
      of: [{ type: "string" }],
      description: "Special circumstances or exceptions",
      options: {
        layout: "tags",
      },
    }),
    defineField({
      name: "isActive",
      title: "Active",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "isDefault",
      title: "Default Policy",
      type: "boolean",
      description: "Use as default cancellation policy",
      initialValue: false,
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
      policyType: "policyType",
      isActive: "isActive",
    },
    prepare(selection) {
      const { title, policyType, isActive } = selection
      return {
        subtitle: `${policyType} ${isActive ? "✓" : "✗"}`,
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
      title: "Policy Type",
      name: "policyTypeAsc",
      by: [{ field: "policyType", direction: "asc" }],
    },
  ],
})
