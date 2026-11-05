import { defineField, defineType } from "sanity"
import { isUniqueOtherThanLanguage } from "../../lib/utils"

export const locationPageType = defineType({
  name: "locationPage",
  title: "Location & Directions Page",
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
      initialValue: "Location & Directions",
    }),
    defineField({
      name: "subtitle",
      type: "string",
    }),
    defineField({
      name: "description",
      type: "text",
      rows: 3,
      description: "Meta description for SEO",
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
      name: "isPublished",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "coordinates",
      title: "GPS Coordinates (Property Center)",
      type: "geopoint",
      description: "Exact location for map embed",
    }),
    defineField({
      name: "address",
      title: "Full Address",
      type: "object",
      fields: [
        defineField({
          name: "street",
          type: "string",
          title: "Street Address",
        }),
        defineField({
          name: "city",
          type: "string",
          title: "City",
          initialValue: "Puerto Jiménez",
        }),
        defineField({
          name: "region",
          type: "string",
          title: "Region/Province",
          initialValue: "Puntarenas",
        }),
        defineField({
          name: "country",
          type: "string",
          title: "Country",
          initialValue: "Costa Rica",
        }),
        defineField({
          name: "postalCode",
          type: "string",
          title: "Postal Code",
        }),
        defineField({
          name: "formatted",
          type: "string",
          title: "Formatted Address (for display)",
        }),
      ],
    }),
    defineField({
      name: "googleMapsUrl",
      title: "Google Maps URL",
      type: "url",
      description: "Link to Google Maps location",
    }),
    defineField({
      name: "appleMapsUrl",
      title: "Apple Maps URL",
      type: "url",
    }),
    defineField({
      name: "wazeUrl",
      title: "Waze URL",
      type: "url",
    }),
    defineField({
      name: "directions",
      title: "Directions from Key Locations",
      type: "array",
      of: [
        {
          type: "object",
          name: "directionItem",
          title: "Direction",
          fields: [
            defineField({
              name: "fromLocation",
              type: "string",
              title: "From Location",
              validation: rule => rule.required(),
              options: {
                list: [
                  { title: "San José (SJO Airport)", value: "sjo" },
                  { title: "San José City Center", value: "san-jose" },
                  { title: "Puerto Jiménez Airport (PJM)", value: "pjm" },
                  { title: "Puerto Jiménez Town", value: "puerto-jimenez" },
                  { title: "San Vito", value: "san-vito" },
                  { title: "Panama Border (Paso Canoas)", value: "panama" },
                  { title: "Manuel Antonio / Quepos", value: "manuel-antonio" },
                  { title: "Uvita / Dominical", value: "uvita" },
                  { title: "Custom", value: "custom" },
                ],
              },
            }),
            defineField({
              name: "customFromLabel",
              type: "string",
              title: "Custom 'From' Label",
              description: "Only used if 'From Location' is Custom",
              hidden: ({ parent }) => parent?.fromLocation !== "custom",
            }),
            defineField({
              name: "transportMode",
              type: "string",
              title: "Transport Mode",
              options: {
                list: [
                  { title: "Drive (Self-drive)", value: "drive" },
                  { title: "Domestic Flight + Transfer", value: "flight-transfer" },
                  { title: "Private Transfer / Shuttle", value: "shuttle" },
                  { title: "Public Bus", value: "bus" },
                  { title: "4x4 Required", value: "4x4" },
                ],
              },
            }),
            defineField({
              name: "duration",
              type: "string",
              title: "Estimated Duration",
              description: "e.g., '6–7 hours', '45 min flight + 15 min drive'",
            }),
            defineField({
              name: "distance",
              type: "string",
              title: "Distance",
              description: "e.g., '350 km', '6 km'",
            }),
            defineField({
              name: "roadConditions",
              type: "text",
              title: "Road Conditions & Notes",
              rows: 3,
              description: "Paved/unpaved, seasonal considerations, 4x4 recommendation",
            }),
            defineField({
              name: "stepByStep",
              type: "array",
              title: "Step-by-Step Directions",
              of: [
                {
                  type: "object",
                  name: "step",
                  fields: [
                    defineField({
                      name: "stepNumber",
                      type: "number",
                      title: "Step #",
                    }),
                    defineField({
                      name: "instruction",
                      type: "text",
                      title: "Instruction",
                      rows: 2,
                    }),
                    defineField({
                      name: "landmark",
                      type: "string",
                      title: "Landmark / Reference Point",
                    }),
                  ],
                  preview: {
                    select: {
                      title: "instruction",
                      subtitle: "landmark",
                    },
                  },
                },
              ],
            }),
            defineField({
              name: "tips",
              type: "array",
              title: "Pro Tips",
              of: [{ type: "string" }],
              options: {
                layout: "tags",
              },
            }),
            defineField({
              name: "costEstimate",
              type: "string",
              title: "Cost Estimate (USD)",
              description: "e.g., '$150-200 for private transfer', '$25-40 for bus'",
            }),
            defineField({
              name: "bookingRequired",
              type: "boolean",
              title: "Advance Booking Required",
              initialValue: false,
            }),
            defineField({
              name: "contactForBooking",
              type: "string",
              title: "Booking Contact Info",
              description: "Phone, email, or link to book this transport option",
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
              title: "fromLocation",
              subtitle: "transportMode",
            },
          },
        },
      ],
    }),
    defineField({
      name: "localTransport",
      title: "Local Transport Options",
      type: "array",
      of: [
        {
          type: "object",
          name: "localTransportItem",
          fields: [
            defineField({
              name: "name",
              type: "string",
              title: "Service Name",
              validation: rule => rule.required(),
            }),
            defineField({
              name: "type",
              type: "string",
              title: "Type",
              options: {
                list: [
                  { title: "Taxi", value: "taxi" },
                  { title: "Shuttle", value: "shuttle" },
                  { title: "Rental Car", value: "rental-car" },
                  { title: "Tour Operator", value: "tour-operator" },
                  { title: "Bicycle/Scooter Rental", value: "bike" },
                ],
              },
            }),
            defineField({
              name: "description",
              type: "text",
              rows: 2,
            }),
            defineField({
              name: "contact",
              type: "string",
              title: "Contact (Phone/WhatsApp/Email)",
            }),
            defineField({
              name: "website",
              type: "url",
              title: "Website",
            }),
            defineField({
              name: "languages",
              type: "array",
              title: "Languages Spoken",
              of: [{ type: "string" }],
              options: { layout: "tags" },
            }),
          ],
        },
      ],
    }),
    defineField({
      name: "nearbyAttractions",
      title: "Nearby Attractions & Points of Interest",
      type: "array",
      of: [
        {
          type: "object",
          name: "nearbyAttraction",
          fields: [
            defineField({
              name: "name",
              type: "string",
              title: "Name",
              validation: rule => rule.required(),
            }),
            defineField({
              name: "description",
              type: "text",
              rows: 2,
            }),
            defineField({
              name: "distance",
              type: "string",
              title: "Distance from Villa Bruno",
              description: "e.g., '15 min drive', '45 min drive'",
            }),
            defineField({
              name: "category",
              type: "string",
              title: "Category",
              options: {
                list: [
                  { title: "National Park", value: "national-park" },
                  { title: "Beach", value: "beach" },
                  { title: "Wildlife Viewing", value: "wildlife" },
                  { title: "Town/Services", value: "town" },
                  { title: "Restaurant", value: "restaurant" },
                  { title: "Adventure", value: "adventure" },
                  { title: "Cultural", value: "cultural" },
                ],
              },
            }),
            defineField({
              name: "coordinates",
              type: "geopoint",
              title: "GPS Coordinates",
            }),
            defineField({
              name: "image",
              type: "imageWithMetadata",
            }),
          ],
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