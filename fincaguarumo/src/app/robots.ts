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
      {
        userAgent: "Googlebot",
        allow: ["/"],
        disallow: ["/api/", "/studio/", "/admin/", "/_next/"],
      },
      {
        userAgent: "Bingbot",
        allow: ["/"],
        disallow: ["/api/", "/studio/", "/admin/", "/_next/"],
      },
      {
        userAgent: "GPTBot",
        allow: ["/"],
        disallow: ["/api/", "/studio/", "/admin/", "/_next/"],
      },
      {
        userAgent: "OAI-SearchBot",
        allow: ["/"],
        disallow: ["/api/", "/studio/", "/admin/", "/_next/"],
      },
      {
        userAgent: "ClaudeBot",
        allow: ["/"],
        disallow: ["/api/", "/studio/", "/admin/", "/_next/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/"],
        disallow: ["/api/", "/studio/", "/admin/", "/_next/"],
      },
    ],
    sitemap: "https://fincaguarumo.com/sitemap.xml",
  }
}