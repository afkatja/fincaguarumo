import { defineField, defineType, Rule } from "sanity"

export const propertyType = defineType({
  name: "property",
  title: "Property",
  type: "document",
  fields: [
    defineField({
      name: "language",
      type: "string",
      readOnly: true,
      hidden: true,
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
          { title: "Cabin", value: "cabin" },
        ],
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: "title",
      title: "Property Name",
      type: "string",
      validation: Rule => Rule.required().max(100),
    }),
    defineField({
      name: "subtitle",
      title: "Subtitle",
      type: "string",
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: "capacity",
      title: "Capacity",
      type: "object",
      fields: [
        defineField({
          name: "maxGuests",
          title: "Maximum Guests",
          type: "number",
          validation: Rule => Rule.required().min(1).max(20),
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
          type: "string",
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
        }),
        defineField({
          name: "coordinates",
          title: "Coordinates",
          type: "geopoint",
        }),
        defineField({
          name: "proximity",
          title: "Proximity to Points of Interest",
          type: "array",
          of: [{ type: "string" }],
        }),
      ],
    }),
    defineField({
      name: "propertyOverview",
      title: "Property Overview",
      type: "object",
      fields: [
        defineField({
          name: "title",
          title: "Overview Title",
          type: "string",
        }),
        defineField({
          name: "subtitle",
          title: "Overview Subtitle",
          type: "string",
        }),
        defineField({
          name: "description",
          title: "Overview Description",
          type: "text",
        }),
        defineField({
          name: "features",
          title: "Key Features",
          type: "array",
          of: [{ type: "string" }],
        }),
        defineField({
          name: "highlights",
          title: "Highlights",
          type: "array",
          of: [{ type: "string" }],
        }),
      ],
    }),
    defineField({
      name: "amenities",
      title: "Amenities",
      type: "array",
      of: [{ type: "reference", to: [{ type: "amenities" }] }],
    }),
    defineField({
      name: "price",
      title: "Base Price per Night",
      type: "number",
      validation: Rule => Rule.required().min(0),
    }),
    defineField({
      name: "images",
      title: "Property Images",
      type: "array",
      of: [{ type: "imageWithMetadata" }],
    }),
    defineField({
      name: "mainImage",
      title: "Main Image",
      type: "imageWithMetadata",
    }),
    defineField({
      name: "isPublished",
      title: "Published",
      type: "boolean",
      initialValue: true,
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "propertyType",
      media: "mainImage",
    },
  },
})
