import { defineField, defineType } from "sanity"
import { isUniqueOtherThanLanguage } from "../../lib/utils"

export const accommodationType = defineType({
  name: "accommodation",
  title: "Accommodation Page",
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
      validation: rule => rule.required(),
    }),
    defineField({
      name: "subtitle",
      type: "string",
    }),
    defineField({
      name: "description",
      type: "string",
      validation: rule => rule.required(),
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
      validation: rule => rule.required(),
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
      initialValue: true,
    }),
    defineField({
      name: "showFAQ",
      type: "boolean",
      title: "Show FAQ",
      description: "Enable to display FAQ section on this page",
      initialValue: true,
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
      initialValue: true,
    }),
    defineField({
      name: "price",
      type: "number",
      title: "Price per person",
      description: "Price per person in USD",
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
      initialValue: true,
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
      initialValue: "3:00 PM",
    }),
    defineField({
      name: "checkOutTime",
      title: "Check-out Time",
      type: "string",
      description: "Default check-out time (e.g., '11:00 AM')",
      initialValue: "11:00 AM",
    }),
    // Accommodation-specific fields
    defineField({
      name: "capacity",
      title: "Maximum Capacity",
      type: "number",
      description: "Maximum number of guests",
      initialValue: 4,
      validation: rule => rule.min(1).max(10),
    }),
    defineField({
      name: "bedrooms",
      title: "Number of Bedrooms",
      type: "number",
      initialValue: 1,
      validation: rule => rule.min(0),
    }),
    defineField({
      name: "bathrooms",
      title: "Number of Bathrooms",
      type: "number",
      initialValue: 1,
      validation: rule => rule.min(0),
    }),
    defineField({
      name: "propertyType",
      title: "Property Type",
      type: "string",
      options: {
        list: [
          { title: "Villa", value: "villa" },
          { title: "House", value: "house" },
          { title: "Apartment", value: "apartment" },
          { title: "Studio", value: "studio" },
          { title: "Cabin", value: "cabin" },
          { title: "Eco-Lodge", value: "eco-lodge" },
        ],
      },
      initialValue: "villa",
    }),
    defineField({
      name: "location",
      title: "Location Details",
      type: "object",
      fields: [
        defineField({
          name: "address",
          title: "Address",
          type: "string",
        }),
        defineField({
          name: "city",
          title: "City",
          type: "string",
          initialValue: "Puerto Jiménez",
        }),
        defineField({
          name: "region",
          title: "Region",
          type: "string",
          initialValue: "Puntarenas",
        }),
        defineField({
          name: "country",
          title: "Country",
          type: "string",
          initialValue: "Costa Rica",
        }),
        defineField({
          name: "coordinates",
          title: "GPS Coordinates",
          type: "geopoint",
          description: "Exact location for maps",
        }),
      ],
    }),
    defineField({
      name: "highlightFeatures",
      title: "Highlight Features",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "title",
              type: "string",
              validation: rule => rule.required(),
            }),
            defineField({
              name: "description",
              type: "text",
              validation: rule => rule.required(),
            }),
            defineField({
              name: "icon",
              type: "string",
              description: "Icon name (e.g., 'wifi', 'pool', 'nature')",
            }),
          ],
        },
      ],
      description: "Key features to highlight in the quick info bar",
    }),
  ],
  initialValue: {
    isPublished: true,
    showBookingOptions: true,
    showFAQ: true,
    showBookingDialog: true,
    displayReviews: true,
    propertyType: "villa",
    capacity: 4,
    bedrooms: 1,
    bathrooms: 1,
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
