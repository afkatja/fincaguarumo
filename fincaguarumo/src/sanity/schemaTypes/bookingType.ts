import { defineType } from "sanity"

export const bookingType = defineType({
  name: "booking",
  type: "document",
  title: "Booking",
  fields: [
    { name: "checkIn", type: "datetime", title: "Check-in" },
    {
      name: "checkOut",
      type: "datetime",
      title: "Check-out",
      validation: (Rule: any) =>
        Rule.required().custom((checkOut: string, context: any) => {
          const checkIn = context.document?.checkIn
          if (checkIn && checkOut && new Date(checkOut) <= new Date(checkIn)) {
            return "Check-out must be after check-in"
          }
          return true
        }),
    },
    { name: "guestName", type: "string", title: "Guest Name" },
    {
      name: "source",
      type: "string",
      title: "Source",
      options: {
        list: [
          { title: "Direct", value: "direct" },
          { title: "Airbnb", value: "airbnb" },
          { title: "Booking.com", value: "booking" },
          { title: "Expedia", value: "expedia" },
        ],
        layout: "dropdown",
      },
    },
    {
      name: "uid",
      type: "string",
      title: "UID",
      description:
        "Stable external id (e.g., Stripe object id) for idempotency.",
      validation: (Rule: any) => Rule.required(),
    },
  ],
})
