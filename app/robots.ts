import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The CMS carries a noindex tag of its own; this keeps crawlers from
      // requesting it at all, along with the endpoints behind it.
      disallow: ["/admin", "/api/"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
