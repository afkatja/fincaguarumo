import { defineField, defineType } from "sanity"

export const paymentMethodsType = defineType({
  name: "paymentMethods",
  title: "Payment Methods",
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
      name: "methodType",
      title: "Payment Method",
      type: "string",
      options: {
        list: [
          { title: "Credit Card", value: "credit_card" },
          { title: "Debit Card", value: "debit_card" },
          { title: "Bank Transfer", value: "bank_transfer" },
          { title: "PayPal", value: "paypal" },
          { title: "Apple pay", value: "apple" },
          { title: "Google Pay", value: "google" },
        ],
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: "processor",
      title: "Payment Processor",
      type: "string",
      description: "e.g., Stripe, PayPal, Bank Name",
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      validation: Rule => Rule.required().max(500),
    }),
    defineField({
      name: "processingTime",
      title: "Processing Time",
      type: "string",
      description: "e.g., 'Instant', '2-3 business days'",
    }),
    defineField({
      name: "fees",
      title: "Fees",
      type: "text",
      rows: 2,
      description: "Any processing fees or charges",
    }),
    defineField({
      name: "supportedCards",
      title: "Supported Cards",
      type: "array",
      of: [{ type: "string" }],
      description: "For credit/debit cards",
      options: {
        layout: "tags",
      },
      hidden: ({ document }) =>
        !["credit_card", "debit_card"].includes((document as any)?.methodType),
    }),
    defineField({
      name: "instructions",
      title: "Instructions",
      type: "text",
      rows: 4,
      description: "Step-by-step instructions for this payment method",
    }),
    defineField({
      name: "isAvailable",
      title: "Available",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "isRecommended",
      title: "Recommended",
      type: "boolean",
      description: "Highlight as recommended payment method",
      initialValue: false,
    }),
    defineField({
      name: "displayOrder",
      title: "Display Order",
      type: "number",
      description: "Lower numbers appear first",
    }),
    defineField({
      name: "icon",
      title: "Icon",
      type: "string",
      description: "Icon name or URL",
    }),
  ],
  preview: {
    select: {
      title: "title",
      methodType: "methodType",
      isAvailable: "isAvailable",
    },
    prepare(selection) {
      const { title, methodType, isAvailable } = selection
      return {
        subtitle: `${methodType} ${isAvailable ? "✓" : "✗"}`,
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
      title: "Method Type",
      name: "methodTypeAsc",
      by: [{ field: "methodType", direction: "asc" }],
    },
  ],
})
