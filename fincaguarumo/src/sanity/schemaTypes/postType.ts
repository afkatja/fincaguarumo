import { defineField, defineType } from "sanity"
import { isUniqueOtherThanLanguage } from "../../lib/utils"

export const postType = defineType({
  name: "post",
  title: "Post",
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
      name: "tldr",
      title: "Short description",
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
          .error("A slug is required to generate a post on the website"),
    }),
    defineField({
      name: "author",
      type: "reference",
      to: { type: "author" },
    }),
    defineField({
      name: "mainImage",
      type: "imageWithMetadata",
    }),
    defineField({
      name: "categories",
      type: "array",
      of: [{ type: "reference", to: { type: "category" } }],
    }),
    defineField({
      name: "publishedAt",
      type: "datetime",
    }),
    defineField({
      name: "body",
      type: "blockContent",
    }),
    defineField({
      name: "openGraph",
      title: "Open Graph",
      type: "object",
      fields: [
        defineField({
          name: "title",
          title: "OG Title",
          type: "string",
          description:
            "Optional title for social sharing. Defaults to the post title if empty.",
        }),
        defineField({
          name: "description",
          title: "OG Description",
          type: "text",
          description:
            "Optional short description for social sharing. Defaults to an automatic summary if empty.",
        }),
        defineField({
          name: "url",
          title: "OG URL override",
          type: "url",
          description:
            "Optional canonical URL for this post. Leave empty to use the site default URL for this post.",
        }),
        defineField({
          name: "image",
          title: "OG Image",
          type: "imageWithMetadata",
          description:
            "Optional image for social sharing. Leave empty to fall back to the main image.",
        }),
      ],
    }),
    defineField({
      name: "isPublished",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "faq",
      type: "array",
      of: [{ type: "reference", to: { type: "faq" } }],
    }),
  ],
  initialValue: {
    isPublished: true,
  },
  preview: {
    select: {
      title: "title",
      author: "author.name",
      media: "mainImage",
    },
    prepare(selection) {
      const { author } = selection
      return { ...selection, subtitle: author && `by ${author}` }
    },
  },
})
