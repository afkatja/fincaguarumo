import { groq } from "next-sanity"

export const POSTS_QUERY = groq`*[_type == "post" && defined(slug.current)][0...12]{
  _id, title, slug
}`

export const POST_QUERY = groq`*[_type == "post" && slug.current == $slug][0]{
  title, body, mainImage
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
  title, 
  slug, 
  description, 
  images, 
  price, 
  location, 
  duration
}
`
