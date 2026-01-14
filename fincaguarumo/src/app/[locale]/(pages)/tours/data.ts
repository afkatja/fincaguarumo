import { SanityImageObject } from "../../../../types"

export type TTour = {
  title: string
  slug?: { current: string }
  description: string
  mainImage?: SanityImageObject
  slideshow: { images: SanityImageObject[] }
  price: number
  location?: string
  geo?: { lat: number; lng: number }
  guests?: number
  isFeatured?: boolean
  isNew?: boolean
  duration?: number
  body?: any
  language?: string
  isPublished: boolean
  dialog?: IDialog
}
export type IField = {
  _key: string
  value: string
}

export type IDialog = {
  cta?: IField[]
  date?: IField[]
  selectDate?: IField[]
  guests?: IField[]
  adults?: IField[]
  adult?: IField[]
  child?: IField[]
  other?: IField[]
  paymentMethod?: IField[]
  creditCard?: IField[]
  paypal?: IField[]
  people?: IField[]
  total?: IField[]
  ok?: IField[]
  cancel?: IField[]
}
