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
      type: "array",
      of: [
        { type: "imageWithMetadata", title: "Image with metadata" },
        { type: "image" },
      ],
      options: {
        layout: "grid",
      },
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
