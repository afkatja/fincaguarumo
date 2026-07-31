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
      name: "email",
      type: "string",
      title: "Email",
      validation: (Rule: any) => Rule.optional().email(),
    },
    {
      name: "phone",
      type: "string",
      title: "Phone Number",
    },
    {
      name: "guests",
      type: "number",
      title: "Number of Guests",
      validation: (Rule: any) => Rule.optional().min(1).max(20),
    },
    {
      name: "totalPrice",
      type: "number",
      title: "Total Price",
      description: "Total amount paid for the booking",
    },
    {
      name: "currency",
      type: "string",
      title: "Currency",
      options: {
        list: [
          { title: "USD", value: "usd" },
          { title: "EUR", value: "eur" },
          { title: "CRC", value: "crc" },
        ],
      },
      initialValue: "usd",
    },
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
          { title: "VRBO", value: "vrbo" },
          { title: "Your Rentals", value: "yourrentals" },
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
    {
      name: "syncedAt",
      type: "datetime",
      title: "Last Synced",
      description:
        "When this booking was last synchronized from external sources",
      readOnly: true,
    },
    {
      name: "isTest",
      type: "boolean",
      title: "Test Booking",
      description:
        "Mark this booking as a test booking to prevent calendar synchronization",
      initialValue: false,
    },
  ],
})
