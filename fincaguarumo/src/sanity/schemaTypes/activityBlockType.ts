import { defineField, defineType } from "sanity"
import { isUniqueOtherThanLanguage } from "../../lib/utils"

export const activityBlockType = defineType({
  name: "activityBlock",
  title: "Activity Block",
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
      description: "Optional subtitle for the activity section",
    }),
    defineField({
      name: "description",
      type: "text",
      rows: 3,
      description: "Brief introduction to the activities section",
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
      description: "Order in which to display multiple activity blocks",
      initialValue: 0,
    }),
    defineField({
      name: "activities",
      title: "Activities Table",
      type: "array",
      of: [
        {
          type: "object",
          name: "activityItem",
          title: "Activity",
          fields: [
            defineField({
              name: "name",
              type: "string",
              title: "Activity Name",
              validation: rule => rule.required(),
            }),
            defineField({
              name: "description",
              type: "text",
              rows: 2,
              title: "Short Description",
            }),
            defineField({
              name: "season",
              type: "string",
              title: "Best Season",
              options: {
                list: [
                  { title: "Year-round", value: "year-round" },
                  { title: "Dry Season (Dec–Apr)", value: "dry" },
                  { title: "Green Season (May–Nov)", value: "green" },
                  { title: "Whale Season (Jul–Oct)", value: "whale" },
                ],
              },
            }),
            defineField({
              name: "duration",
              type: "string",
              title: "Duration",
              description: "e.g., '4 hours', 'Full day', '2–3 hours'",
            }),
            defineField({
              name: "distanceFromVilla",
              type: "string",
              title: "Distance from Villa Bruno",
              description: "e.g., 'On property', '15 min drive', '45 min drive'",
            }),
            defineField({
              name: "transportIncluded",
              type: "boolean",
              title: "Transport Included",
              initialValue: false,
            }),
            defineField({
              name: "difficulty",
              type: "string",
              title: "Difficulty Level",
              options: {
                list: [
                  { title: "Easy", value: "easy" },
                  { title: "Moderate", value: "moderate" },
                  { title: "Challenging", value: "challenging" },
                ],
              },
            }),
            defineField({
              name: "highlights",
              type: "array",
              title: "Key Highlights",
              of: [{ type: "string" }],
              options: {
                layout: "tags",
              },
            }),
            defineField({
              name: "icon",
              type: "string",
              title: "Icon Name",
              description: "Icon identifier for UI (e.g., 'bird', 'hiking', 'whale', 'park')",
            }),
            defineField({
              name: "isFeatured",
              type: "boolean",
              title: "Featured Activity",
              initialValue: false,
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
              title: "name",
              subtitle: "season",
              media: "icon",
            },
          },
        },
      ],
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