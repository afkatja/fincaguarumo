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
]

export default tours
