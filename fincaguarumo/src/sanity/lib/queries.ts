import { groq } from "next-sanity"

export const POSTS_QUERY = groq`*[_type == "post" && defined(slug.current)][0...12]{
  _id, title, slug, mainImage
}`

export const FEATURED_POSTS_QUERY = groq`
  *[_type == 'post' && defined(slug.current) && $category in categories[] -> title && language == $language] {
    title, slug, mainImage, 'category': *[_type == 'category' && title == $category],
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
  title, body, mainImage, language,
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
    title, description, mainImage, body, language, 
    "translations": *[
      _type == "translation.metadata" && 
      ^._id in translations[].value._ref
    ][0].translations[]{
      ...(value->{
        language,
        title,
        slug, 
        body
      })
    }
  }
`
export const NAV_QUERY = groq`
  *[_type == 'page' && language == $language && $category in categories[] -> title] {
    title, slug, language,
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
  description,
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
  "gallery": {
    images->{images}
  }, 
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
    hero_title, hero_slogan, subtitle, language, featured_content_title,
    featured_blog_title, slug, intro_body,
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
