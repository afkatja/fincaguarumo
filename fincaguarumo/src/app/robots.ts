import { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: ["/studio/", "/login/", "/register/"],
      },
      {
        userAgent: "*",
        disallow: ["/*.pdf$", "/*.doc$"],
      },
    ],
    sitemap: "https://fincaguarumo.com/sitemap.xml",
  }
}
