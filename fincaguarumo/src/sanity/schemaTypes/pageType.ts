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
      name: "showBookingOptions",
      type: "boolean",
      title: "Show Booking Options",
      description:
        "Enable to display booking options from Booking.com and Expedia",
      initialValue: false,
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
      name: "showBookingDialog",
      type: "boolean",
      title: "Show Booking Dialog",
      description: "Enable to display booking dialog",
      initialValue: false,
    }),
    defineField({
      name: "price",
      type: "number",
      title: "Price per person",
      description: "Price per person in USD",
      hidden: ({ document }) => !document?.showBookingDialog,
      validation: rule =>
        rule
          .min(0)
          .precision(2)
          .custom((value, context) => {
            const enabled = Boolean(context.document?.showBookingDialog)
            if (enabled && (value === undefined || value === null)) {
              return "Price is required when Booking Dialog is enabled"
            }
            return true
          }),
    }),
    defineField({
      name: "displayReviews",
      type: "boolean",
      title: "Display featured reviews",
      description: "Enable to display featured reviews on this page",
      initialValue: false,
    }),
    defineField({
      name: "amenities",
      title: "Amenities",
      type: "array",
      of: [{ type: "reference", to: { type: "amenities" } }],
      description: "Select amenities available at this property",
    }),
    defineField({
      name: "pricingRules",
      title: "Pricing Rules",
      type: "array",
      of: [{ type: "reference", to: { type: "pricingRules" } }],
      description: "Applicable pricing rules for this property",
    }),
    defineField({
      name: "paymentMethods",
      title: "Accepted Payment Methods",
      type: "array",
      of: [{ type: "reference", to: { type: "paymentMethods" } }],
      description: "Payment methods accepted for this property",
    }),
    defineField({
      name: "cancellationPolicy",
      title: "Cancellation Policy",
      type: "reference",
      to: { type: "cancellationPolicies" },
      description: "Default cancellation policy for this property",
    }),
    defineField({
      name: "logistics",
      title: "Logistics Information",
      type: "array",
      of: [{ type: "reference", to: { type: "logistics" } }],
      description: "Check-in/out, transportation, and local information",
    }),
    defineField({
      name: "checkInTime",
      title: "Check-in Time",
      type: "string",
      description: "Default check-in time (e.g., '3:00 PM')",
    }),
    defineField({
      name: "checkOutTime",
      title: "Check-out Time",
      type: "string",
      description: "Default check-out time (e.g., '11:00 AM')",
    }),
  ],
  initialValue: {
    isPublished: true,
    showBookingOptions: false,
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
