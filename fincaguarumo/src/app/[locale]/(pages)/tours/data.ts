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
  duration?: number
  body?: any
  language?: string
  isPublished: boolean
  dialog?: { _ref: string }
}

const tours = [
  {
    title: "sunrise",
    description:
      "see the sun rise from Golfo Dulce and immerse yourself in the lush jungle life waking up around you",
    url: "tours/sunrise",
    isFeatured: true,
    images: [
      {
        src: "https://picsum.photos/id/251/1920/1080",
        alt: "",
        width: 1920,
        height: 1080,
      },
      {
        src: "https://picsum.photos/id/222/1920/1080",
        alt: "",
        width: 1920,
        height: 1080,
      },
      {
        src: "https://picsum.photos/id/330/1920/1080",
        alt: "",
        width: 1920,
        height: 1080,
      },
    ],
  },
  {
    title: "sunset",
    description:
      "see the sun set behind Corcovado National Park and into the Pacific Ocean, while enjoying the breeze and the magnificent colors of the sky and the jungle around you",
    url: "tours/sunset",
    isFeatured: true,
    images: [
      {
        src: "https://picsum.photos/id/53/1920/1080",
        alt: "",
        width: 1920,
        height: 1080,
      },
      {
        src: "https://picsum.photos/id/62/1920/1080",
        alt: "",
        width: 1920,
        height: 1080,
      },
      {
        src: "https://picsum.photos/id/368/1920/1080",
        alt: "",
        width: 1920,
        height: 1080,
      },
    ],
  },
  {
    title: "horse back riding",
    description:
      "experience the top of the hill and the jungle around you from the back of the horse, your tempo, your level",
    url: "tours/horses",
    images: [
      {
        src: "https://picsum.photos/id/353/1920/1080",
        alt: "",
        width: 1920,
        height: 1080,
      },
      {
        src: "https://picsum.photos/id/416/1920/1080",
        alt: "",
        width: 1920,
        height: 1080,
      },
      {
        src: "https://picsum.photos/id/340/1920/1080",
        alt: "",
        width: 1920,
        height: 1080,
      },
    ],
  },
  {
    title: "cacao - the growing, the roasting, the grinding, and tasting",
    description:
      "see the making of chocolate in action - from the tree, to the roastery, the grinder, and taste the artesanal, organic, home made cacao made by locals the traditional way",
    url: "tours/cacao",
    isNew: true,
    images: [
      {
        src: "https://picsum.photos/id/425/1920/1080",
        alt: "",
        width: 1920,
        height: 1080,
      },
      {
        src: "https://picsum.photos/id/635/1920/1080",
        alt: "",
        width: 1920,
        height: 1080,
      },
      {
        src: "https://picsum.photos/id/490/1920/1080",
        alt: "",
        width: 1920,
        height: 1080,
      },
    ],
  },
  {
    title:
      "a challenging 20km hike through a local farm, primary and secondary jungle, towards the ocean side of the peninsula and back up the road for magnificent views of the ocean and Golfo Dolce",
    description:
      "get your hiking shoes ready and water bottles full, we're going for a half day hike starting very early in the morning, passing a local farm, a dense primary and secondary forest, descend towards the ocean and climb back again for the magnificent views",
    url: "tours/hike20km",
    dateAdded: new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    images: [
      {
        src: "https://picsum.photos/id/705/1920/1080",
        alt: "",
        width: 1920,
        height: 1080,
      },
      {
        src: "https://picsum.photos/id/715/1920/1080",
        alt: "",
        width: 1920,
        height: 1080,
      },
      {
        src: "https://picsum.photos/id/807/1920/1080",
        alt: "",
        width: 1920,
        height: 1080,
      },
    ],
  },
  {
    title: "Birdwatching",
    description:
      "Get up early and embark on a photography tour in search of the beautiful birds living in the jungle. During some months, you can get a chance to witness the migratory birds, even - if you're lucky! - the three-watted bellbird",
    url: "tours/farm-lunch",
    dateAdded: new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    images: [
      {
        src: "https://upload.wikimedia.org/wikipedia/commons/f/fc/Procnias_tricarunculatus_Monteverde_03.jpg",
        alt: "",
        width: 1920,
        height: 1080,
      },
      {
        src: "https://en.wikipedia.org/wiki/Summer_tanager#/media/File:Summer_tanager_(Piranga_rubra)_male_Copan_3.jpg",
        alt: "",
        width: 1920,
        height: 1080,
      },
      {
        src: "https://en.wikipedia.org/wiki/Chuck-will%27s-widow#/media/File:Chuck-wills-widow_RWD7.jpg",
        alt: "",
        width: 1920,
        height: 1080,
      },
    ],
  },
  {
    title: "Visit the local farm",
    description:
      "Depending on the season, see the cows being milked (the artesanal way) or even the calves being born and enjoy an organic locally grown typical Tico lunch together with the family",
    url: "tours/farm-lunch",
    dateAdded: new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    images: [
      {
        src: "https://picsum.photos/id/488/1920/1080",
        alt: "",
        width: 1920,
        height: 1080,
      },
      {
        src: "https://picsum.photos/id/490/1920/1080",
        alt: "",
        width: 1920,
        height: 1080,
      },
      {
        src: "https://picsum.photos/id/292/1920/1080",
        alt: "",
        width: 1920,
        height: 1080,
      },
    ],
  },
  {
    title: "Explore local jungle",
    description:
      "Marvel at the huge and tiny creatures of the jungle, like the giant strangle ficus tree, colonies of leaf-cutter ants, poisonous frogs around pools and rivers, snakes, and - with some luck - catch a glimpse of one of the feline predators or stand eye in eye with one of other mammals",
    url: "tours/jungle",
    dateAdded: new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    images: [
      {
        src: "https://picsum.photos/id/498/1920/1080",
        alt: "",
        width: 1920,
        height: 1080,
      },
      {
        src: "https://picsum.photos/id/502/1920/1080",
        alt: "",
        width: 1920,
        height: 1080,
      },
      {
        src: "https://picsum.photos/id/543/1920/1080",
        alt: "",
        width: 1920,
        height: 1080,
      },
    ],
  },
  {
    title: "Hike to the top of the peninsula",
    description:
      "Hike to a place where you can see both Golfo Dulce and Pacific Ocean at the same time. See some animals on the way, like various kinds of monkeys, coatis, and lots of birds",
    url: "tours/vista",
    images: [
      {
        src: "https://picsum.photos/id/715/1920/1080",
        alt: "",
        width: 1920,
        height: 1080,
      },
      {
        src: "https://picsum.photos/id/770/1920/1080",
        alt: "",
        width: 1920,
        height: 1080,
      },
      {
        src: "https://picsum.photos/id/830/1920/1080",
        alt: "",
        width: 1920,
        height: 1080,
      },
    ],
  },
]

export default tours
