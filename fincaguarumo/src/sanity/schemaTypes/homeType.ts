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
      name: "featured_content_title",
      type: "string",
    }),
    defineField({
      name: "featured_blog_title",
      type: "string",
    }),
  ],
  preview: {
    select: {
      title: "title",
    },
  },
})
