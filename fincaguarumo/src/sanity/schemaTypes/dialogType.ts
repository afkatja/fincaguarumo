import { defineType, defineField } from "sanity"

export const dialogType = defineType({
  title: "Dialog",
  name: "dialog",
  type: "document",
  fields: [
    defineField({
      type: "internationalizedArrayString",
      name: "CTA_button",
      initialValue: "Reserve",
      description: `Call to action, like "Reserve now"`,
    }),
    defineField({
      type: "internationalizedArrayString",
      name: "Date_label",
    }),
    defineField({
      type: "internationalizedArrayString",
      name: "Select_date",
    }),
    defineField({
      type: "internationalizedArrayString",
      name: "Guests_label",
      description: "Label for amount of guests selector",
    }),
    defineField({
      type: "internationalizedArrayString",
      name: "Adults_label",
      description: "Label for plural adults option",
    }),
    defineField({
      type: "internationalizedArrayString",
      name: "Adult_label",
      description: "Label for singular adult option",
    }),
    defineField({
      type: "internationalizedArrayString",
      name: "Child_label",
      description: "Label for child option",
    }),
    defineField({
      type: "internationalizedArrayString",
      name: "Other_label",
      description: "Label for other option in guests selector",
    }),
    defineField({
      type: "internationalizedArrayString",
      name: "Payment_method_label",
    }),
    defineField({
      type: "internationalizedArrayString",
      name: "Credit_card_label",
    }),
    defineField({
      type: "internationalizedArrayString",
      name: "Paypal_label",
    }),
    defineField({
      type: "internationalizedArrayString",
      name: "Person_label",
      description: "Label for 1 person",
    }),
    defineField({
      type: "internationalizedArrayString",
      name: "People_label",
      description: "Label for amount of people",
    }),
    defineField({
      type: "internationalizedArrayString",
      name: "Total_label",
    }),
    defineField({
      type: "internationalizedArrayString",
      name: "OK_button_label",
    }),
    defineField({
      type: "internationalizedArrayString",
      name: "Cancel_button_label",
    }),
  ],
})
