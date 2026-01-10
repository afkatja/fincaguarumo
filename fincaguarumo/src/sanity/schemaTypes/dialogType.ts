import { defineType, defineField } from "sanity"

export const dialogType = defineType({
  title: "Dialog",
  name: "dialog",
  type: "document",
  fields: [
    defineField({
      name: "title",
      type: "string",
      title: "Title",
    }),
    defineField({
      type: "internationalizedArrayString",
      name: "CTA_button",
      initialValue: "Reserve",
      description: `Call to action, like "Reserve now"`,
    }),
    defineField({
      type: "internationalizedArrayString",
      name: "Date_label",
      initialValue: "Date",
    }),
    defineField({
      type: "string",
      name: "Select_date",
      initialValue: "Select date",
    }),
    defineField({
      type: "string",
      name: "Guests_label",
      description: "Label for amount of guests selector",
      initialValue: "Guests",
    }),
    defineField({
      type: "string",
      name: "Adults_label",
      description: "Label for plural adults option",
      initialValue: "Adults",
    }),
    defineField({
      type: "string",
      name: "Adult_label",
      description: "Label for singular adult option",
      initialValue: "Adult",
    }),
    defineField({
      type: "string",
      name: "Child_label",
      description: "Label for child option",
      initialValue: "Child",
    }),
    defineField({
      type: "string",
      name: "Other_label",
      description: "Label for other option in guests selector",
      initialValue: "Other",
    }),
    defineField({
      type: "string",
      name: "Payment_method_label",
      initialValue: "Payment method",
    }),
    defineField({
      type: "string",
      name: "Credit_card_label",
      initialValue: "Credit card",
    }),
    defineField({
      type: "string",
      name: "Paypal_label",
      initialValue: "PayPal",
    }),
    defineField({
      type: "string",
      name: "Person_label",
      description: "Label for 1 person",
      initialValue: "person",
    }),
    defineField({
      type: "string",
      name: "People_label",
      description: "Label for amount of people",
      initialValue: "people",
    }),
    defineField({
      type: "string",
      name: "Total_label",
      initialValue: "Total",
    }),
    defineField({
      type: "string",
      name: "OK_button_label",
      initialValue: "OK",
    }),
    defineField({
      type: "string",
      name: "Cancel_button_label",
      initialValue: "Cancel",
    }),
  ],
  preview: {
    select: {
      title: "title",
    },
    prepare(selection) {
      return { ...selection }
    },
  },
})
