import { defineField, defineType } from "sanity"
import { isUniqueOtherThanLanguage } from "../../lib/utils"

export const whyChooseVillaBrunoType = defineType({
  name: "whyChooseVillaBruno",
  title: "Why Choose Villa Bruno",
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
      initialValue: "Why Choose Villa Bruno",
    }),
    defineField({
      name: "subtitle",
      type: "string",
    }),
    defineField({
      name: "description",
      type: "text",
      rows: 3,
      description: "Intro text for the comparison section",
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
          .error("A slug is required"),
    }),
    defineField({
      name: "mainImage",
      type: "imageWithMetadata",
    }),
    defineField({
      name: "isPublished",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "displayOrder",
      type: "number",
      title: "Display Order",
      initialValue: 0,
    }),
    defineField({
      name: "comparisonTable",
      title: "Comparison Table",
      type: "array",
      of: [
        {
          type: "object",
          name: "comparisonRow",
          title: "Comparison Row",
          fields: [
            defineField({
              name: "feature",
              type: "string",
              title: "Feature / Aspect",
              validation: rule => rule.required(),
            }),
            defineField({
              name: "villaBruno",
              type: "string",
              title: "Villa Bruno at Finca Guarumo",
              description: "What Villa Bruno offers for this feature",
              validation: rule => rule.required(),
            }),
            defineField({
              name: "largeEcoResorts",
              type: "string",
              title: "Large Eco-Resorts",
              description: "Typical offering at large eco-resorts",
            }),
            defineField({
              name: "corcovadoLodges",
              type: "string",
              title: "Corcovado Lodges",
              description: "Typical offering at lodges inside Corcovado",
            }),
            defineField({
              name: "traditionalHotels",
              type: "string",
              title: "Traditional Hotels",
              description: "Typical offering at traditional hotels in area",
            }),
            defineField({
              name: "otherVacationRentals",
              type: "string",
              title: "Other Vacation Rentals",
              description: "Typical offering at other vacation rentals",
            }),
            defineField({
              name: "category",
              type: "string",
              title: "Category",
              options: {
                list: [
                  { title: "Sustainability", value: "sustainability" },
                  { title: "Experience", value: "experience" },
                  { title: "Comfort & Amenities", value: "comfort" },
                  { title: "Location & Access", value: "location" },
                  { title: "Value", value: "value" },
                ],
              },
            }),
            defineField({
              name: "sortOrder",
              type: "number",
              title: "Sort Order",
              initialValue: 0,
            }),
            defineField({
              name: "isHighlight",
              type: "boolean",
              title: "Key Differentiator",
              description: "Mark as a key differentiator to highlight visually",
              initialValue: false,
            }),
          ],
          preview: {
            select: {
              title: "feature",
              subtitle: "category",
            },
          },
        },
      ],
    }),
    defineField({
      name: "keyDifferentiators",
      title: "Key Differentiators (Bullet Points)",
      type: "array",
      of: [
        {
          type: "object",
          name: "differentiator",
          fields: [
            defineField({
              name: "title",
              type: "string",
              title: "Title",
              validation: rule => rule.required(),
            }),
            defineField({
              name: "description",
              type: "text",
              rows: 3,
              title: "Description",
              validation: rule => rule.required(),
            }),
            defineField({
              name: "icon",
              type: "string",
              title: "Icon Name",
              description: "Icon identifier (e.g., 'solar', 'wildlife', 'wifi', 'host')",
            }),
            defineField({
              name: "sortOrder",
              type: "number",
              title: "Sort Order",
              initialValue: 0,
            }),
          ],
          preview: {
            select: {
              title: "title",
              subtitle: "icon",
            },
          },
        },
      ],
    }),
    defineField({
      name: "idealFor",
      title: "Ideal For",
      type: "array",
      of: [{ type: "string" }],
      options: {
        layout: "tags",
      },
      description: "Guest types this property is ideal for",
    }),
    defineField({
      name: "lessSuitableFor",
      title: "Less Suitable For",
      type: "array",
      of: [{ type: "string" }],
      options: {
        layout: "tags",
      },
      description: "Guest types this property is less suitable for",
    }),
    defineField({
      name: "seoKeywords",
      type: "array",
      title: "SEO Keywords",
      of: [{ type: "string" }],
      options: {
        layout: "tags",
      },
    }),
  ],
  initialValue: {
    isPublished: true,
    displayOrder: 0,
  },
  preview: {
    select: {
      title: "title",
      subtitle: "subtitle",
      media: "mainImage",
    },
    prepare(selection) {
      return { ...selection }
    },
  },
})