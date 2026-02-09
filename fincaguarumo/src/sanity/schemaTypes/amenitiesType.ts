import { defineField, defineType } from "sanity"

export const amenitiesType = defineType({
  name: "amenities",
  title: "Amenities",
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
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "title",
        maxLength: 96,
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      options: {
        list: [
          { title: "General", value: "general" },
          { title: "Kitchen", value: "kitchen" },
          { title: "Bathroom", value: "bathroom" },
          { title: "Bedroom", value: "bedroom" },
          { title: "Outdoor", value: "outdoor" },
          { title: "Entertainment", value: "entertainment" },
          { title: "Services", value: "services" },
          { title: "Safety", value: "safety" },
        ],
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      validation: Rule => Rule.required().max(500),
    }),
    defineField({
      name: "icon",
      title: "Icon",
      type: "string",
      description: "Icon name (e.g., wifi, pool, parking)",
    }),
    defineField({
      name: "image",
      title: "Image",
      type: "imageWithMetadata",
      description: "Optional image for the amenity",
    }),
    defineField({
      name: "isFeatured",
      title: "Featured Amenity",
      type: "boolean",
      description: "Highlight this amenity on property pages",
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
      media: "image",
    },
    prepare(selection) {
      const { title, category } = selection
      return {
        subtitle: `${category}`,
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
