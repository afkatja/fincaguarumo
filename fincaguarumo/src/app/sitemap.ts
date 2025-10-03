import { MetadataRoute } from "next"
import { generateSitemap } from "../lib/generateSiteMap"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls = await generateSitemap()
  return urls
}
