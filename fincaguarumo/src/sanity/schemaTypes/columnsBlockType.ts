import { defineType, defineField } from "sanity"
import ColumnsBlockPreview from "../components/ColumnsBlockPreview"

export const columnsBlockType = defineType({
  name: "columnsBlock",
  title: "Columns",
  type: "object",
  fields: [
    defineField({
      name: "columnCount",
      title: "Column Count",
      type: "string",
      options: {
        list: [
          { title: "2 columns", value: "2" },
          { title: "3 columns", value: "3" },
        ],
        layout: "radio",
      },
    }),
    defineField({
      name: "content",
      title: "Content",
      type: "array",
      of: [{ type: "block" }, { type: "imageWithMetadata" }],
    }),
  ],
  preview: {
    select: {
      columnCount: "columnCount",
    },
    prepare: selection => {
      const { columnCount } = selection
      return {
        title: `${columnCount} columns`,
        media: ColumnsBlockPreview,
      }
    },
  },
})
