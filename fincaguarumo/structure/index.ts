import {
  StructureResolver,
  DefaultDocumentNodeResolver,
  ListItemBuilder,
  ListItem,
  Divider,
  StructureBuilder,
} from "sanity/structure"
import { i18n } from "../languages"

const languagesMap: ({
  S,
  title,
  schemaType,
}: {
  S: StructureBuilder
  title: string
  schemaType: string
}) => ListItemBuilder[] | ListItem[] | Divider[] = ({
  S,
  title,
  schemaType,
}) => {
  return [
    ...i18n.languages.map(language =>
      S.listItem()
        .title(title)
        .schemaType(schemaType)
        .child(
          S.documentList()
            .id(language.id)
            .title(`${language.title} ${title}`)
            .schemaType(schemaType)
            .filter(`_type == ${schemaType} && language == $language`)
            .params({ language: language.id })
            .canHandleIntent((intentName, params) => {
              return intentName === "edit" || params.template === title
            })
        )
    ),
  ]
}

export const structure: StructureResolver = S =>
  S.list()
    .title("Content")
    .items([
      // Custom document-level translation structure
      S.listItem()
        .title("Pages")
        .child(
          S.list()
            .title("Page")
            .items(languagesMap({ S, title: "page", schemaType: "page" }))
        ),
      S.listItem()
        .title("Tours")
        .child(
          S.list()
            .title("Tour")
            .items(languagesMap({ S, title: "tour", schemaType: "tour" }))
        ),
      S.listItem()
        .title("Posts")
        .child(
          S.list()
            .title("Post")
            .items(languagesMap({ S, title: "post", schemaType: "post" }))
        ),
    ])

export const defaultDocumentNode: DefaultDocumentNodeResolver = (
  S,
  { schemaType, getClient }
) => {
  switch (schemaType) {
    case "page":
    case "tour":
    case "post":
    case "dialog":
      return S.document().views([
        S.view.form(),
        // preview(S, client)
      ])
    default:
      return S.document()
  }
}
