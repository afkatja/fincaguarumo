import { groq } from "next-sanity"

// Reusable image projection fragments (explicit crop/hotspot for urlFor)
const imageWithMetadata = groq`...select(
  _type == "imageWithMetadata" || _type == "image" => {
    ...,
    crop,
    hotspot,
    "url": asset->url,
    "metadata": asset->metadata {
      lqip,
      dimensions
    }
  }
)`
const mainImageWithUrl = groq`{
  ...,
  crop,
  hotspot,
  "url": asset->url,
  "metadata": asset->metadata
}`
const mainImageMetadataOnly = groq`{
  ...,
  crop,
  hotspot,
  "metadata": asset->metadata
}`
const mainImageWithDimensions = groq`{
  ...,
  alt,
  crop,
  hotspot,
  asset,
  "url": asset->url,
  "metadata": asset->metadata {
    lqip,
    dimensions
  }
}`
const imageMetadataOnly = groq`...,
  crop,
  hotspot,
  "metadata": asset->metadata`

// For gallery/slideshow: supports both imageWithMetadata and artDirectedImage
const galleryImageProjection = groq`{
  _type,
  ...select(
    _type == "artDirectedImage" => {
      "desktop": desktop ${mainImageMetadataOnly},
      "tablet": tablet ${mainImageMetadataOnly},
      "mobile": mobile ${mainImageMetadataOnly}
    },
    _type == "imageWithMetadata" || _type == "image" => 
      ${mainImageWithDimensions}
  )
}`

export const POSTS_QUERY = groq`*[_type == "post" && defined(slug.current) && (language == "en" || !defined(language))][0...32]{
  _id, title, slug, 
  mainImage ${mainImageWithUrl},
  _createdAt, _updatedAt, isPublished
}`
export const ALL_PAGES_QUERY = groq`*[_type == "page" && defined(slug.current)][]{
  _id, title, slug, subtitle, body, _createdAt, _updatedAt, isPublished
}`

export const PAGES_QUERY = groq`*[_type == "page" && slug.current == $slug && language == $language][0] {
  title, subtitle, description,
  mainImage mainImageMetadataOnly,
  body[]{
    ...,
    ${imageWithMetadata}
  }, language, slug, isPublished, showBookingOptions, showBookingDialog,
  slideshow->{
    "images": images[]${galleryImageProjection}
  },
  price, faq[]->{ question, answer, slug, keywords, showOnVillaBruno, category->{title, slug} },
  "translations": coalesce(
    *[_type == "translation" && ^._id in translations[].value._ref][0].translations[]{
      ...(value->{
        language,
        title,
        subtitle,
        description,
        slug,
        body[]{
          ...,
          ${imageWithMetadata}
        },
        showBookingOptions,
        showBookingDialog,
        faq[]->{ question, answer, slug, keywords, showOnVillaBruno, category->{title, slug} }
      })
    },
    []
  )
}`

export const FEATURED_POSTS_QUERY = groq`
  *[_type == 'post' && defined(slug.current) && $category in categories[]->title && language == $language] {
    title,
    slug,
    isPublished,
    mainImage ${mainImageWithUrl},
    'category': *[_type == 'category' && title == $category],
    "translations": *[
      _type == "translation.metadata" && 
      ^._id in translations[].value._ref
    ][0].translations[]{
      ...(value->{
        language,
        title,
        slug
      })
    }
  }
`

export const POST_QUERY = groq`*[_type == "post" && slug.current == $slug && (language == "en" || !defined(language))][0]{
  title, 
  body[]{
    ...,
    ${imageWithMetadata},
    columnsBlock {
      columnCount,
      content[]{
        ...,
        ${imageWithMetadata}
      }
    }
  },
  mainImage ${mainImageWithDimensions}, 
  openGraph {
    title,
    description,
    url,
    image ${mainImageWithDimensions}
  },
  language, isPublished, slug
}`

export const PAGE_QUERY = groq`
  *[_type == 'page' && slug.current == $pageName && language == $language][0] {
    title, 
    subtitle, 
    description, 
    mainImage ${mainImageWithDimensions}, 
    body[]{
      ...,
      ${imageWithMetadata}
    }, language, isPublished, categories[]->{title}, showBookingOptions, showBookingDialog,
    slideshow->{ 
      "images": images[]${galleryImageProjection} 
    }, 
    price,
    faq[]->{question, answer, slug},
    "translations": *[
      _type == "translation.metadata" &&
      ^._id in translations[].value._ref
    ][0].translations[]{
      ...(value->{
        language,
        title,
        subtitle,
        slug,
        body[]{
          ...,
          ${imageWithMetadata}
        },
        isPublished,
        faq[]->{ question, answer, slug },
      })
    }
  }
`
export const NAV_QUERY = groq`
  *[_type == 'page' && language == $language && $category in categories[] -> title] {
    title, slug, language, isPublished,
    "translations": *[
      _type == "translation.metadata" && 
      ^._id in translations[].value._ref
    ][0].translations[]{
      ...(value->{
        language,
        title,
        slug
      })
    }
  }
`

export const TOURS_QUERY = groq`*[_type == 'tour' && defined(slug.current) && language == $language]{
  slug,
  title, 
  mainImage ${mainImageWithUrl},
  description, 
  dateAdded,
  language,
  isPublished,
  _createdAt,
  _updatedAt,
  "translations": *[
      _type == "translation.metadata" && 
      ^._id in translations[].value._ref
    ][0].translations[]{
      ...(value->{
        language,
        title,
        slug, description
      })
    }
}
`

export const FEATURED_TOURS_QUERY = groq`*[_type == 'tour' && defined(slug.current) && isFeatured && language == $language]{
  slug,
  title, 
  mainImage ${mainImageWithDimensions},
  description, isPublished,
   "translations": *[
      _type == "translation.metadata" && 
      ^._id in translations[].value._ref
    ][0].translations[]{
      ...(value->{
        language,
        title,
        slug, description
      })
    }
}
`

export const DIALOG_QUERY = groq`*[_type == 'dialog'][0] {
  _id,
  'cta': "CTA_button",
  'date': "Date_label",
  'selectDate': "Select_date",
  'guests': "Guests_label",
  'adults': "Adults_label",
  'adult': "Adult_label",
  'child': "Child_label",
  'other': "Other_label",
  'paymentMethod': "Payment_method_label",
  'creditCard': "Credit_card_label",
  'paypal': "Paypal_label",
  'people': "People_label",
  'person': "Person_label",
  'total': "Total_label",
  'ok': "OK_button_label",
  'cancel': "Cancel_button_label",
}
`

export const TOUR_QUERY = groq`
*[_type == 'tour' && slug.current == $slug && language == $language][0]{
  _id,
  language,
  title,
  slug,
  description,
  mainImage ${mainImageWithDimensions},
  isPublished,
  slideshow->{ "images": images[]${galleryImageProjection} },
  "price": coalesce(price, 0),
  location,
  geo,
  duration,
  body[]{
    ...,
    ${imageWithMetadata}
  },
    "translations": *[
      _type == "translation.metadata" && 
      ^._id in translations[].value._ref
    ][0].translations[]{
      ...(value->{
        language,
        title,
        slug,
        description,
        body[]{
          ...,
          ${imageWithMetadata}
        },
      })
    }
}
`

export const ABOUT_QUERY = groq`
  *[_type == 'page' && slug.current == 'about' && language == $language][0] {
    title, description, mainImage, body, language,
    "translations": *[
      _type == "translation.metadata" && 
      ^._id in translations[].value._ref
    ][0].translations[]{
      ...(value->{
        language,
        title,
        slug
      })
    }
  }
`

export const HOME_QUERY = groq`
  *[_type=='home' && language == $language][0] {
    hero_title,
    hero_slogan,
    hero_body[]{
      ...,
      ${imageWithMetadata}
    },
    subtitle,
    language,
    featured_content_title,
    featured_blog_title,
    slug,
    'mediaUrl': background_media.asset->{url},
    'mediaPoster': background_media_poster.asset->{
      url,
      metadata {
        lqip
      }
    },
    intro_body[]{
      ...,
      ${imageWithMetadata},
      markDefs[] {
        ...,
        _type == "internalLink" => {
          ...,
          "slug": @.reference-> slug
        }
      }
    },
    'translations': *[
      _type == "translation.metadata" &&
      ^._id in translations[].value._ref
    ][0].translations[]{
      ...(value->{
        hero_title,
        hero_slogan,
        hero_body[]{
          ...,
          ${imageWithMetadata}
        },
        subtitle,
        language,
        featured_content_title,
        featured_blog_title,
        slug,
        'mediaUrl': background_media.asset->{url},
        'mediaPoster': background_media_poster.asset->{
          url,
          metadata {
            lqip
          }
        },
        intro_body[]{
          ...,
          ${imageWithMetadata},
          markDefs[] {
            ...,
            _type == "internalLink" => {
              ...,
              "slug": @.reference-> slug
            }
          }
        }
      })
    }
  }
`

export const GALLERY_QUERY = groq`
  *[_type == 'gallery' && $category in categories[] -> title][0] {
    title,
    "images": images[]${galleryImageProjection}
  }
`

export const FAQ_QUERY = groq`
  *[_type == 'faq' && language == $language] | order(displayOrder asc) {
    category->{title, slug, language}, question, answer, keywords, showOnVillaBruno, slug, language,
    "translations": *[
      _type == "translation.metadata" &&
      ^._id in translations[].value._ref
    ][0].translations[]{
      ...(value->{
        language,
        category->{title, slug, language}, question, answer, keywords, showOnVillaBruno, slug
      })
    }
  }
`

export const BOOKINGS_QUERY = groq`*[
  _type == "booking" &&
  dateTime(checkOut) > dateTime(now()) &&
  !(_id in path("drafts.**"))
]{
  uid, checkIn, checkOut, guestName, source
}`

export const REVIEWS_QUERY = groq`*[_type == "review"] | order(date desc){
  _id,
  platform,
  author,
  rating,
  date,
  reviewText,
  photoUrl
}`
