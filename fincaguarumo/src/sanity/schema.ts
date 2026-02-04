import { type SchemaTypeDefinition } from "sanity"

import { blockContentType } from "./schemaTypes/blockContentType"
import { categoryType } from "./schemaTypes/categoryType"
import { postType } from "./schemaTypes/postType"
import { authorType } from "./schemaTypes/authorType"
import { pageType } from "./schemaTypes/pageType"
import { tourType } from "./schemaTypes/tourType"
import { homeType } from "./schemaTypes/homeType"
import { dialogType } from "./schemaTypes/dialogType"
// import { breakType } from "./schemaTypes/breakType"
// import { richTextType } from "./schemaTypes/richTextType"
import { galleryType } from "./schemaTypes/galleryType"
import { bookingType } from "./schemaTypes/bookingType"
import { faqType } from "./schemaTypes/faqType"
import { faqCategoryType } from "./schemaTypes/faqCategoryType"
import { reviewType } from "./schemaTypes/reviewType"
import { imageType } from "./schemaTypes/imageType"

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    homeType,
    blockContentType,
    categoryType,
    postType,
    authorType,
    pageType,
    tourType,
    dialogType,
    // breakType,
    // richTextType,
    galleryType,
    bookingType,
    faqType,
    faqCategoryType,
    reviewType,
    imageType,
  ],
}
