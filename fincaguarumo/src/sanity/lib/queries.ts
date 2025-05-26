import { groq } from "next-sanity"

export const POSTS_QUERY = groq`*[_type == "post" && defined(slug.current)][0...12]{
  
  _id, title, slug, mainImage, _createdAt, _updatedAt, isPublished
}`
export const ALL_PAGES_QUERY = groq`*[_type == "page" && defined(slug.current)][0...12]{
  _id, title, slug, subtitle, body, _createdAt, _updatedAt, isPublished
}`

export const PAGES_QUERY = groq`*[_type == "page" && slug.current == $slug && language == $language][0] {
  title, subtitle, description, mainImage, body, language, slug, isPublished, showBookingOptions,
  slideshow->{images}
  , 
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
        showBookingOptions
      })
    }
}`

export const FEATURED_POSTS_QUERY = groq`
  *[_type == 'post' && defined(slug.current) && $category in categories[] -> title && language == $language] {
    title, slug, mainImage, isPublished, 'category': *[_type == 'category' && title == $category],
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
    title, subtitle, description, mainImage, body 
    // {
    //   ..., {
    //     markDefs[] {
    //     ...,
    //     _type == "internalLink" => {
    //       ...,
    //       "slug": @.reference-> slug
    //     }
    //   }},
    // }
    , language, isPublished,
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
        body, isPublished
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
  mainImage,
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
  mainImage,
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

export const TOUR_QUERY = groq`
*[_type == 'tour' && slug.current == $slug && language == $language][0]{
  _id, 
  language,
  title, 
  slug, 
  description, 
  mainImage, isPublished,
  slideshow->{images}, 
  price, 
  location, 
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
        dialog,
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
    subtitle, 
    language, 
    featured_content_title,
    featured_blog_title, 
    slug, 
    'mediaUrl': background_media.asset->{url}, 
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
        hero_title, hero_slogan, subtitle, language, featured_content_title, slug, featured_blog_title, intro_body
      })
    }
  }
`

export const GALLERY_QUERY = groq`
  *[_type == 'gallery' && $category in categories[] -> title][0] {
    title, images
  }
`
