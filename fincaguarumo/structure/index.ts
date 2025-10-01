import {
  StructureResolver,
  DefaultDocumentNodeResolver,
  ListItemBuilder,
  ListItem,
  Divider,
  StructureBuilder,
} from "sanity/structure"
import { i18n } from "../languages"

const getTranslationItems = (
  S: StructureBuilder,
  schemaType: string,
  title: string,
  queryType: "slug" | "reference" | "standalone" = "slug"
) => {
  return S.documentList()
    .title(title)
    .schemaType(schemaType)
    .filter('_type == $type && language == "en"')
    .params({ type: schemaType })
    .child(id =>
      S.list()
        .title("Translations")
        .items([
          S.listItem()
            .title(
              `Source (${i18n.languages.find(item => item.isDefault)?.title})`
            )
            .child(S.document().schemaType(schemaType).documentId(id)),
          ...i18n.languages
            .filter(lang => lang.id !== "en")
            .map(lang => {
              let filter = ""

              // Different filter based on content type
              switch (queryType) {
                case "standalone":
                  // For home page - typically only one document
                  filter = "_type == $type && language == $lang"
                  break
                case "reference":
                  // For FAQ and other types that use references
                  filter = `_type == $type && language == $lang && (
                    _id in *[_type == "translation.metadata" && $id in translations[].value._ref][0].translations[].value._ref ||
                    slug.current == *[_id == $id][0].slug.current
                  )`
                  break
                case "slug":
                default:
                  // For pages, posts, tours that use slug matching
                  filter = `_type == $type && language == $lang && _id in *[_type == "translation.metadata" && $id in translations[].value._ref][0].translations[].value._ref`
                  break
              }

              return S.listItem()
                .title(`${lang.title}`)
                .child(
                  S.documentList()
                    .title(`${lang.title}`)
                    .schemaType(schemaType)
                    .filter(filter)
                    .params({
                      type: schemaType,
                      lang: lang.id,
                      id: id,
                    })
                )
            }),
        ])
    )
}

export const structure: StructureResolver = S => {
  // Debug log
  console.log("Building structure...")

  const list = S.list()
    .title("Content")
    .items([
      // Document-level translations
      S.listItem()
        .title("Homepage")
        .child(getTranslationItems(S, "home", "Home", "standalone")),
      S.listItem()
        .title("Pages")
        .child(getTranslationItems(S, "page", "Pages", "slug")),
      S.listItem()
        .title("Tours")
        .child(getTranslationItems(S, "tour", "Tours", "slug")),
      S.listItem()
        .title("Posts")
        .child(getTranslationItems(S, "post", "Posts", "slug")),
      S.listItem()
        .title("FAQ")
        .child(getTranslationItems(S, "faq", "FAQ", "reference")),

      S.divider(),
      S.listItem()
        .title("Gallery")
        .schemaType("gallery")
        .child(
          S.documentList()
            .title("Gallery")
            .schemaType("gallery")
            .filter('_type == "gallery"')
        ),
      S.listItem()
        .title("Categories")
        .schemaType("category")
        .child(
          S.documentList()
            .title("Categories")
            .schemaType("category")
            .filter('_type == "category"')
        ),
      S.listItem()
        .title("Authors")
        .schemaType("author")
        .child(
          S.documentList()
            .title("Authors")
            .schemaType("author")
            .filter('_type == "author"')
        ),
      // Field-level translations
      S.divider(),
      S.listItem()
        .title("Dialog")
        .schemaType("dialog")
        .child(
          S.documentList()
            .title("Dialog")
            .schemaType("dialog")
            .filter('_type == "dialog"')
            .defaultOrdering([{ field: "title", direction: "asc" }])
            .initialValueTemplates([
              S.initialValueTemplateItem("dialog", { title: "" }),
            ])
        ),
    ])
  return list
}

export const defaultDocumentNode: DefaultDocumentNodeResolver = (
  S,
  { schemaType, getClient }
) => {
  switch (schemaType) {
    case "page":
    case "tour":
    case "post":
    case "faq":
    case "gallery":
    case "category":
    case "author":
    case "dialog":
      return S.document().views([
        S.view.form(),
        // preview(S, client)
      ])
    default:
      return S.document()
  }
}
