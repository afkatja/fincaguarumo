import { groq } from "next-sanity"

export const POSTS_QUERY = groq`*[_type == "post" && defined(slug.current)][0...12]{
  _id, title, slug, mainImage, _createdAt, _updatedAt, isPublished
}`
export const ALL_PAGES_QUERY = groq`*[_type == "page" && defined(slug.current)][0...12]{
  _id, title, slug, subtitle, body, _createdAt, _updatedAt, isPublished
}`

export const PAGES_QUERY = groq`*[_type == "page" && slug.current == $slug && language == $language][0] {
  title, subtitle, description, 
  mainImage {
    ..., 
    'metadata': asset->metadata
  }, 
  body, language, slug, isPublished, showBookingOptions, showBookingDialog,
  slideshow->{
  images[]{
    ...,
    'metadata': asset->metadata
  }
},
  price, faq[]->{ question, answer, slug, keywords, showOnVillaBruno, category },
  "translations": coalesce(
    *[_type == "translation" && ^._id in translations[].value._ref][0].translations[]{
      ...(value->{
        language,
        title,
        subtitle,
        description,
        mainImage {..., 'metadata': asset->metadata},
        slug, 
        body,
        showBookingOptions,
        showBookingDialog,
        faq[]->{ question, answer, slug, keywords, showOnVillaBruno, category }
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
    mainImage {
      ...,
      "url": asset->url,
      "metadata": asset->metadata
    },
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

export const POST_QUERY = groq`*[_type == "post" && slug.current == $slug][0]{
  title, body, mainImage, language, isPublished, slug,
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
}`

export const PAGE_QUERY = groq`
  *[_type == 'page' && slug.current == $pageName && language == $language][0] {
    title, subtitle, description, mainImage, body, language, isPublished, categories[]->{title}, showBookingOptions, showBookingDialog,
    slideshow->{images}, price,
    faq[]->{question, answer, slug},
    "translations": *[
      _type == "translation.metadata" && 
      ^._id in translations[].value._ref
    ][0].translations[]{
      ...(value->{
        language,
        title,
        subtitle,
        mainImage,
        slug, 
        body, 
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
  mainImage {
    ...,
    "url": asset->url,
    "metadata": asset->metadata
  },
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
  mainImage {
    alt,
    "url": asset->url,
    "metadata": asset->metadata {
      lqip,
      dimensions
    }
  },
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

export const DIALOG_QUERY = groq`
*[_type == 'dialog'][0] {
  'cta': CTA_button,
  'date': Date_label,
  'selectDate': Select_date,
  'guests': Guests_label,
  'adults': Adults_label,
  'adult': Adult_label,
  'child': Child_label,
  'other': Other_label,
  'paymentMethod': Payment_method_label,
  'creditCard': Credit_card_label,
  'paypal': Paypal_label,
  'people': People_label,
  'person': Person_label,
  'total': Total_label,
  'ok': OK_button_label,
  'cancel': Cancel_button_label,
  "translations": *[
      _type == "translation.metadata" && 
      ^._id in translations[].value._ref
    ][0].translations[]{
      ...(value->{
          'cta': CTA_button,
          'date': Date_label,
          'selectDate': Select_date,
          'guests': Guests_label,
          'adults': Adults_label,
          'adult': Adult_label,
          'child': Child_label,
          'other': Other_label,
          'paymentMethod': Payment_method_label,
          'creditCard': Credit_card_label,
          'paypal': Paypal_label,
          'people': People_label,
          'person': Person_label,
          'total': Total_label,
          'ok': OK_button_label,
          'cancel': Cancel_button_label,
      })
    }
}
`

export const TOUR_QUERY = groq`
*[_type == 'tour' && slug.current == $slug && language == $language][0]{
  _id, 
  language,
  title, 
  slug, 
  description, 
  mainImage {
    alt,
    "url": asset->url,
    "metadata": asset->metadata {
      lqip,
      dimensions
    }
  },
  isPublished,
  slideshow->{images}, 
  price, 
  location, 
  geo,
  duration,
  body,
  dialog,
  "translations": *[
      _type == "translation.metadata" && 
      ^._id in translations[].value._ref
    ][0].translations[]{
      ...(value->{
        language,
        title,
        slug,
        description,
        body,
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
    hero_body,
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
    intro_body[] {
      ...,
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
        hero_title, hero_slogan, hero_body,subtitle, language, featured_content_title, slug, featured_blog_title, intro_body
      })
    }
  }
`

export const GALLERY_QUERY = groq`
  *[_type == 'gallery' && $category in categories[] -> title][0] {
    title, images[] {
      ...,
      "metadata": asset->metadata
    }
  }
`

export const FAQ_QUERY = groq`
  *[_type == 'faq' && language == $language] | order(displayOrder asc) {
    category, question, answer, keywords, showOnVillaBruno, slug, language,
    "translations": *[
      _type == "translation.metadata" && 
      ^._id in translations[].value._ref
    ][0].translations[]{
      ...(value->{
        language,
        category, question, answer, keywords, showOnVillaBruno, slug
      })
    }
  }
`
