import { defineField, defineType } from "sanity"

export const homeType = defineType({
  name: "home",
  title: "Home page",
  type: "document",
  fields: [
    defineField({
      name: "language",
      type: "string",
      readOnly: true,
      // hidden: true,
    }),
    defineField({
      name: "title",
      type: "string",
    }),

    defineField({
      name: "hero_title",
      type: "string",
    }),
    defineField({
      name: "hero_slogan",
      type: "string",
    }),
    defineField({
      name: "subtitle",
      type: "string",
    }),
    defineField({
      name: "hero_body",
      type: "blockContent",
    }),
    defineField({
      name: "intro_body",
      type: "blockContent",
    }),
    defineField({
      name: "background_media",
      type: "file",
      title: "Video",
    }),
    defineField({
      name: "background_media_poster",
      type: "imageWithMetadata",
      title: "Video poster",
    }),
    defineField({
      name: "featured_content_title",
      type: "string",
    }),
    defineField({
      name: "featured_blog_title",
      type: "string",
    }),
    defineField({
      name: "propertyOverview",
      title: "Property Overview",
      type: "text",
      rows: 4,
      description: "Comprehensive description of Villa Bruno",
    }),
    defineField({
      name: "keyFeatures",
      title: "Key Features",
      type: "array",
      of: [{ type: "string" }],
      description: "Main selling points of the property",
      options: {
        layout: "tags",
      },
    }),
    defineField({
      name: "capacity",
      title: "Property Capacity",
      type: "object",
      fields: [
        defineField({
          name: "maxGuests",
          title: "Maximum Guests",
          type: "number",
          validation: Rule => Rule.required().min(1),
        }),
        defineField({
          name: "bedrooms",
          title: "Bedrooms",
          type: "number",
          validation: Rule => Rule.required().min(0),
        }),
        defineField({
          name: "bathrooms",
          title: "Bathrooms",
          type: "number",
          validation: Rule => Rule.required().min(0),
        }),
      ],
    }),
    defineField({
      name: "locationDetails",
      title: "Location Details",
      type: "object",
      fields: [
        defineField({
          name: "address",
          title: "Address",
          type: "text",
          rows: 2,
        }),
        defineField({
          name: "region",
          title: "Region",
          type: "string",
        }),
        defineField({
          name: "country",
          title: "Country",
          type: "string",
          initialValue: "Costa Rica",
        }),
        defineField({
          name: "coordinates",
          title: "Coordinates",
          type: "object",
          fields: [
            defineField({
              name: "lat",
              title: "Latitude",
              type: "number",
            }),
            defineField({
              name: "lng",
              title: "Longitude",
              type: "number",
            }),
          ],
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: "title",
    },
  },
})
