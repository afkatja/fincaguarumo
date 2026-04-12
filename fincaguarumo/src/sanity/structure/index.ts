import {
  StructureResolver,
  DefaultDocumentNodeResolver,
  ListItemBuilder,
  ListItem,
  Divider,
  StructureBuilder,
} from "sanity/structure"
import { i18n } from "../../../languages"
import { hasTranslationQuery } from "../lib/translationQueries"

const getTranslationItems = (
  S: StructureBuilder,
  schemaType: string,
  title: string,
  queryType: "metadata" | "standalone" = "metadata",
) => {
  return S.documentList()
    .title(title)
    .schemaType(schemaType)
    .filter('_type == $type && (language == "en" || !defined(language))')
    .params({ type: schemaType })
    .apiVersion("v2025-02-19")
    .child(id =>
      S.list()
        .title("Translations")
        .items([
          S.listItem()
            .title(
              `Source (${i18n.languages.find(item => item.isDefault)?.title})`,
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
                case "metadata":
                  filter = `_type == $type && (${hasTranslationQuery})`
                  break
                default:
                  filter = "_type == $type"
              }
              return S.listItem()
                .title(`${lang.title}`)
                .child(
                  S.documentList()
                    .title(`${lang.title}`)
                    .schemaType(schemaType)
                    .filter(filter)
                    .apiVersion("v2025-02-19")
                    .params({
                      type: schemaType,
                      lang: lang.id,
                      id: id,
                    }),
                )
            }),
        ]),
    )
}

export const structure: StructureResolver = S => {
  const list = S.list()
    .title("Content")
    .items([
      // Document-level translations
      S.listItem()
        .title("Homepage")
        .child(getTranslationItems(S, "home", "Home", "standalone")),
      S.listItem()
        .title("Pages")
        .child(getTranslationItems(S, "page", "Pages", "metadata")),
      S.listItem()
        .title("Accommodations")
        .child(
          getTranslationItems(S, "accommodation", "Accommodations", "metadata"),
        ),
      S.listItem()
        .title("Tours")
        .child(getTranslationItems(S, "tour", "Tours", "metadata")),
      S.listItem()
        .title("Posts")
        .child(
          S.documentList()
            .title("Posts")
            .schemaType("post")
            .filter(
              '_type == "post" && (language == "en" || !defined(language))',
            )
            .apiVersion("v2025-02-19"),
        ),

      S.listItem()
        .title("FAQ")
        .child(getTranslationItems(S, "faq", "FAQ", "metadata")),

      S.divider(),
      // Booking and Property Management
      S.listItem()
        .title("Bookings")
        .schemaType("booking")
        .child(
          S.documentList()
            .title("Bookings")
            .schemaType("booking")
            .filter('_type == "booking"')
            .apiVersion("v2025-02-19")
            .defaultOrdering([{ field: "checkIn", direction: "desc" }]),
        ),
      S.listItem()
        .title("Amenities")
        .schemaType("amenities")
        .child(
          S.documentList()
            .title("Amenities")
            .schemaType("amenities")
            .filter('_type == "amenities"')
            .apiVersion("v2025-02-19"),
        ),
      S.listItem()
        .title("Pricing Rules")
        .schemaType("pricingRules")
        .child(
          S.documentList()
            .title("Pricing Rules")
            .schemaType("pricingRules")
            .filter('_type == "pricingRules"')
            .apiVersion("v2025-02-19"),
        ),
      S.listItem()
        .title("Payment Methods")
        .schemaType("paymentMethods")
        .child(
          S.documentList()
            .title("Payment Methods")
            .schemaType("paymentMethods")
            .filter('_type == "paymentMethods"')
            .apiVersion("v2025-02-19"),
        ),
      S.listItem()
        .title("Cancellation Policies")
        .schemaType("cancellationPolicies")
        .child(
          S.documentList()
            .title("Cancellation Policies")
            .schemaType("cancellationPolicies")
            .filter('_type == "cancellationPolicies"')
            .apiVersion("v2025-02-19"),
        ),
      S.listItem()
        .title("Logistics")
        .schemaType("logistics")
        .child(
          S.documentList()
            .title("Logistics")
            .schemaType("logistics")
            .filter('_type == "logistics"')
            .apiVersion("v2025-02-19"),
        ),
      S.listItem()
        .title("Reviews")
        .schemaType("review")
        .child(
          S.documentList()
            .title("Reviews")
            .schemaType("review")
            .filter('_type == "review"')
            .apiVersion("v2025-02-19")
            .defaultOrdering([{ field: "date", direction: "desc" }]),
        ),
      S.listItem()
        .title("Property types")
        .schemaType("property")
        .child(
          S.documentList()
            .title("Property types")
            .schemaType("property")
            .filter('_type == "property"')
            .apiVersion("v2025-02-19"),
        ),

      S.divider(),
      S.listItem()
        .title("Gallery")
        .schemaType("gallery")
        .child(
          S.documentList()
            .title("Gallery")
            .schemaType("gallery")
            .filter('_type == "gallery"')
            .apiVersion("v2025-02-19"),
        ),
      S.listItem()
        .title("Categories")
        .schemaType("category")
        .child(
          S.documentList()
            .title("Categories")
            .schemaType("category")
            .filter('_type == "category"')
            .apiVersion("v2025-02-19"),
        ),
      S.listItem()
        .title("FAQ Categories")
        .schemaType("faqCategory")
        .child(
          getTranslationItems(S, "faqCategory", "FAQ categories", "metadata"),
        ),
      S.listItem()
        .title("Authors")
        .schemaType("author")
        .child(
          S.documentList()
            .title("Authors")
            .schemaType("author")
            .filter('_type == "author"')
            .apiVersion("v2025-02-19"),
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
            .apiVersion("v2025-02-19")
            .defaultOrdering([{ field: "title", direction: "asc" }])
            .initialValueTemplates([
              S.initialValueTemplateItem("dialog", { title: "" }),
            ]),
        ),
    ])
  return list
}

export const defaultDocumentNode: DefaultDocumentNodeResolver = (
  S,
  { schemaType, getClient },
) => {
  switch (schemaType) {
    case "page":
    case "accommodation":
    case "tour":
    case "post":
    case "faq":
    case "gallery":
    case "category":
    case "author":
    case "dialog":
    case "amenities":
    case "pricingRules":
    case "paymentMethods":
    case "cancellationPolicies":
    case "logistics":
    case "booking":
    case "review":
    case "property":
      return S.document().views([
        S.view.form(),
        // preview(S, client)
      ])
    default:
      return S.document()
  }
}
