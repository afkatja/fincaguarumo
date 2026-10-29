import { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/api/",
          "/studio/",
          "/login/",
          "/register/",
          "/admin/",
          "/_next/",
          "/_redirects",
          "*.pdf$",
          "*.doc$",
        ],
      },
    ],
    sitemap: "https://fincaguarumo.com/sitemap.xml",
  }
}