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
import { artDirectedImageType } from "./schemaTypes/artDirectedImageType"
import { columnsBlockType } from "./schemaTypes/columnsBlockType"
import { amenitiesType } from "./schemaTypes/amenitiesType"
import { pricingRulesType } from "./schemaTypes/pricingRulesType"
import { paymentMethodsType } from "./schemaTypes/paymentMethodsType"
import { cancellationPoliciesType } from "./schemaTypes/cancellationPoliciesType"
import { logisticsType } from "./schemaTypes/logisticsType"
import { propertyType } from "./schemaTypes/propertyType"
import { accommodationType } from "./schemaTypes/accommodationType"

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    homeType,
    propertyType,
    accommodationType,
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
    artDirectedImageType,
    columnsBlockType,
    amenitiesType,
    pricingRulesType,
    paymentMethodsType,
    cancellationPoliciesType,
    logisticsType,
  ],
}
