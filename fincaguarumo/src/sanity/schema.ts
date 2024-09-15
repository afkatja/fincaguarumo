import { type SchemaTypeDefinition } from "sanity"

import { blockContentType } from "./schemaTypes/blockContentType"
import { categoryType } from "./schemaTypes/categoryType"
import { postType } from "./schemaTypes/postType"
import { authorType } from "./schemaTypes/authorType"
import { pageType } from "./schemaTypes/pageType"
import { tourType } from "./schemaTypes/tourType"
import { homeType } from "./schemaTypes/homeType"

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    homeType,
    blockContentType,
    categoryType,
    postType,
    authorType,
    pageType,
    tourType,
  ],
}
