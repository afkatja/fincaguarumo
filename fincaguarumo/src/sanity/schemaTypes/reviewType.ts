import { defineField, defineType } from "sanity"

export const reviewType = defineType({
  name: "review",
  title: "Review",
  type: "document",
  fields: [
    defineField({
      name: "platform",
      title: "Platform",
      type: "string",
      options: {
        list: [
          { title: "Airbnb", value: "airbnb" },
          { title: "Booking", value: "booking" },
          { title: "Google", value: "google" },
        ],
      },
      validation: rule => rule.required(),
    }),
    defineField({
      name: "author",
      title: "Author",
      type: "object",
      fields: [
        defineField({
          name: "name",
          title: "Name",
          type: "string",
          validation: rule => rule.required(),
        }),
        defineField({
          name: "location",
          title: "Location",
          type: "string",
        }),
        defineField({
          name: "photoURI",
          title: "Photo URI",
          type: "url",
        }),
      ],
    }),
    defineField({
      name: "rating",
      title: "Rating",
      type: "number",
      validation: rule =>
        rule.required().custom((value, context) => {
          const platform = context.document?.platform
          const rating = Number(value)

          if (!platform) {
            return "Platform must be selected before setting rating"
          }

          switch (platform) {
            case "airbnb":
            case "google":
              if (rating < 1 || rating > 5) {
                return `${platform === "airbnb" ? "Airbnb" : "Google"} ratings must be between 1 and 5`
              }
              break
            case "booking":
              if (rating < 1 || rating > 10) {
                return "Booking.com ratings must be between 1 and 10"
              }
              break
            default:
              return "Invalid platform selected"
          }

          return true
        }),
      description:
        "Rating in original platform scale (1-5 for Airbnb/Google, 1-10 for Booking.com).",
    }),
    defineField({
      name: "date",
      title: "Date",
      type: "date",
      validation: rule => rule.required(),
    }),
    defineField({
      name: "reviewText",
      title: "Review Text",
      type: "text",
      validation: rule => rule.required(),
    }),
    defineField({
      name: "photoUrl",
      title: "Photo URL",
      type: "url",
    }),
  ],
  preview: {
    select: {
      title: "author.name",
      subtitle: "platform",
      media: "author.photoURI",
    },
  },
})
