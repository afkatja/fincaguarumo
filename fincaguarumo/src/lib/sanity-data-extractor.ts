import { client } from "@/sanity/lib/client"
import { groq } from "next-sanity"

// Extract all FAQs with categories
export async function extractAllFAQs() {
  const query = groq`*[_type == "faq"] | order(displayOrder asc) {
    _id,
    question,
    answer,
    keywords,
    category->{title, slug},
    language,
    showOnVillaBruno
  }`
  return await client.fetch(query)
}

// Extract FAQs by category
export async function extractFAQsByCategory(categorySlug: string) {
  const query = groq`*[_type == "faq" && category->slug == $categorySlug] | order(displayOrder asc) {
    _id,
    question,
    answer,
    keywords,
    category->{title, slug},
    language
  }`
  return await client.fetch(query, { categorySlug })
}

// Extract page content (villa descriptions)
export async function extractPageContent(slug: string) {
  const query = groq`*[_type == "page" && slug.current == $slug][0] {
    title,
    subtitle,
    description,
    body,
    language,
    price,
    showBookingOptions,
    showBookingDialog,
    categories[]->{title}
  }`
  return await client.fetch(query, { slug })
}

// Extract all villa pages
export async function extractAllPages() {
  const query = groq`*[_type == "page" && isPublished == true] {
    title,
    subtitle,
    description,
    slug,
    language,
    price,
    showBookingOptions,
    categories[]->{title}
  }`
  return await client.fetch(query)
}

// Extract tour information
export async function extractAllTours() {
  const query = groq`*[_type == "tour" && isPublished == true] | order(dateAdded desc) {
    title,
    description,
    location,
    duration,
    price,
    language,
    slug,
    isFeatured,
    isNew
  }`
  return await client.fetch(query)
}

// Extract tour by slug
export async function extractTourBySlug(slug: string) {
  const query = groq`*[_type == "tour" && slug.current == $slug][0] {
    title,
    description,
    location,
    duration,
    price,
    language,
    slug,
    isFeatured,
    isNew,
    body
  }`
  return await client.fetch(query, { slug })
}

// Extract home page content
export async function extractHomeContent() {
  const query = groq`*[_type == "home"][0] {
    hero_title,
    hero_slogan,
    subtitle,
    hero_body,
    intro_body,
    language
  }`
  return await client.fetch(query)
}

// Extract all reviews
export async function extractAllReviews() {
  const query = groq`*[_type == "review"] | order(date desc) {
    _id,
    platform,
    author->{name, location, photoURI},
    rating,
    date,
    reviewText,
    photoUrl
  }`
  return await client.fetch(query)
}

// Extract reviews by platform
export async function extractReviewsByPlatform(platform: "airbnb" | "booking") {
  const query = groq`*[_type == "review" && platform == $platform] | order(date desc) {
    _id,
    author->{name, location, photoURI},
    rating,
    date,
    reviewText,
    photoUrl
  }`
  return await client.fetch(query, { platform })
}

// Extract top-rated reviews
export async function extractTopReviews(limit: number = 10) {
  const query = groq`*[_type == "review"] | order(rating desc, date desc)[0...$limit] {
    _id,
    platform,
    author->{name, location, photoURI},
    rating,
    date,
    reviewText,
    photoUrl
  }`
  return await client.fetch(query, { limit })
}

// Extract all blog posts
export async function extractAllPosts() {
  const query = groq`*[_type == "post" && isPublished == true] | order(publishedAt desc) {
    _id,
    title,
    slug,
    language,
    publishedAt,
    mainImage{
      alt,
      "url": asset->url
    },
    author->{name},
    categories[]->{title},
    body
  }`
  return await client.fetch(query)
}

// Extract posts by category
export async function extractPostsByCategory(categoryTitle: string) {
  const query = groq`*[_type == "post" && isPublished == true && $categoryTitle in categories[]->title] | order(publishedAt desc) {
    _id,
    title,
    slug,
    language,
    publishedAt,
    mainImage{
      alt,
      "url": asset->url
    },
    author->{name},
    categories[]->{title},
    body
  }`
  return await client.fetch(query, { categoryTitle })
}

// Extract post by slug
export async function extractPostBySlug(slug: string) {
  const query = groq`*[_type == "post" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    language,
    publishedAt,
    mainImage{
      alt,
      "url": asset->url
    },
    author->{name},
    categories[]->{title},
    body
  }`
  return await client.fetch(query, { slug })
}

// Search FAQs by keywords
export async function searchFAQs(searchTerm: string, language: string = "en") {
  const searchQuery = groq`*[_type == "faq" && language == $language && (
    question match $searchTerm ||
    answer match $searchTerm ||
    keywords match $searchTerm
  )] | order(displayOrder asc) {
    question,
    answer,
    category->{title},
    keywords
  }`
  return await client.fetch(searchQuery, {
    searchTerm: `*${searchTerm}*`,
    language,
  })
}

// Search posts by keywords
export async function searchPosts(searchTerm: string, language: string = "en") {
  const searchQuery = groq`*[_type == "post" && isPublished == true && language == $language && (
    title match $searchTerm ||
    body match $searchTerm
  )] | order(publishedAt desc) {
    title,
    slug,
    publishedAt,
    author->{name},
    categories[]->{title}
  }`
  return await client.fetch(searchQuery, {
    searchTerm: `*${searchTerm}*`,
    language,
  })
}

// Search tours by keywords
export async function searchTours(searchTerm: string, language: string = "en") {
  const searchQuery = groq`*[_type == "tour" && isPublished == true && language == $language && (
    title match $searchTerm ||
    description match $searchTerm ||
    location match $searchTerm
  )] | order(dateAdded desc) {
    title,
    slug,
    description,
    location,
    duration,
    price,
    isFeatured
  }`
  return await client.fetch(searchQuery, {
    searchTerm: `*${searchTerm}*`,
    language,
  })
}

// Get average rating from reviews
export async function getAverageRating() {
  const query = groq`{
    "average": round(avg(*[_type == "review"].rating) * 10) / 10,
    "total": count(*[_type == "review"]),
    "airbnb": count(*[_type == "review" && platform == "airbnb"]),
    "booking": count(*[_type == "review" && platform == "booking"])
  }`
  return await client.fetch(query)
}
