import { groq } from "next-sanity"

export const POSTS_QUERY = groq`*[_type == "post" && defined(slug.current)][0...12]{
  _id, title, slug
}`

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

export const TOURS_QUERY = groq`*[_type == 'tour' && defined(slug.current)]{
  slug,
  title, 
  mainImage,
  description, 
  dateAdded
}
`

export const TOUR_QUERY = groq`
*[_type == 'tour' && slug.current == $slug][0]{
  _id, 
  language,
  title, 
  slug, 
  description, 
  images, 
  price, 
  location, 
  duration,
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
    hero_title, hero_slogan, subtitle, language,
    'translations': *[
      _type == "translation.metadata" && 
      ^._id in translations[].value._ref
    ][0].translations[]{
      ...(value->{
        hero_title, hero_slogan, subtitle, language
      })
    }
  }
`
