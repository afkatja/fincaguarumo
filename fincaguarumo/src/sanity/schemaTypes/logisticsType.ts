import { defineField, defineType } from "sanity"

export const logisticsType = defineType({
  name: "logistics",
  title: "Logistics",
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
      name: "category",
      title: "Category",
      type: "string",
      options: {
        list: [
          { title: "Check-in/Check-out", value: "checkin_checkout" },
          { title: "Transportation", value: "transportation" },
          { title: "Local Area", value: "local_area" },
          { title: "Emergency", value: "emergency" },
          { title: "House Rules", value: "house_rules" },
          { title: "Services", value: "services" },
        ],
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: "checkInTime",
      title: "Check-in Time",
      type: "string",
      description: "e.g., '3:00 PM'",
      hidden: ({ document }) => (document as any)?.category !== "checkin_checkout",
    }),
    defineField({
      name: "checkOutTime",
      title: "Check-out Time",
      type: "string",
      description: "e.g., '11:00 AM'",
      hidden: ({ document }) => (document as any)?.category !== "checkin_checkout",
    }),
    defineField({
      name: "earlyCheckIn",
      title: "Early Check-in Available",
      type: "boolean",
      initialValue: false,
      hidden: ({ document }) => (document as any)?.category !== "checkin_checkout",
    }),
    defineField({
      name: "earlyCheckInFee",
      title: "Early Check-in Fee",
      type: "number",
      description: "Fee for early check-in",
      hidden: ({ document }) => !(document as any)?.earlyCheckIn || (document as any)?.category !== "checkin_checkout",
    }),
    defineField({
      name: "lateCheckOut",
      title: "Late Check-out Available",
      type: "boolean",
      initialValue: false,
      hidden: ({ document }) => (document as any)?.category !== "checkin_checkout",
    }),
    defineField({
      name: "lateCheckOutFee",
      title: "Late Check-out Fee",
      type: "number",
      description: "Fee for late check-out",
      hidden: ({ document }) => !(document as any)?.lateCheckOut || (document as any)?.category !== "checkin_checkout",
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 4,
      validation: Rule => Rule.required().max(1000),
    }),
    defineField({
      name: "instructions",
      title: "Instructions",
      type: "text",
      rows: 4,
      description: "Step-by-step instructions or details",
    }),
    defineField({
      name: "contactInfo",
      title: "Contact Information",
      type: "text",
      rows: 2,
      description: "Relevant contact details",
      hidden: ({ document }) => (document as any)?.category !== "emergency",
    }),
    defineField({
      name: "address",
      title: "Address",
      type: "text",
      rows: 2,
      hidden: ({ document }) => !["transportation", "local_area"].includes((document as any)?.category),
    }),
    defineField({
      name: "distance",
      title: "Distance",
      type: "string",
      description: "Distance from property",
      hidden: ({ document }) => !["transportation", "local_area"].includes((document as any)?.category),
    }),
    defineField({
      name: "isImportant",
      title: "Important Information",
      type: "boolean",
      description: "Highlight as important for guests",
      initialValue: false,
    }),
    defineField({
      name: "displayOrder",
      title: "Display Order",
      type: "number",
      description: "Lower numbers appear first",
    }),
    defineField({
      name: "keywords",
      title: "Search Keywords",
      type: "array",
      of: [{ type: "string" }],
      description: "Keywords for chatbot search",
      options: {
        layout: "tags",
      },
    }),
  ],
  preview: {
    select: {
      title: "title",
      category: "category",
      isImportant: "isImportant",
    },
    prepare(selection) {
      const { title, category, isImportant } = selection
      return {
        subtitle: `${category} ${isImportant ? "⭐" : ""}`,
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
      title: "Category",
      name: "categoryAsc",
      by: [{ field: "category", direction: "asc" }],
    },
  ],
})
