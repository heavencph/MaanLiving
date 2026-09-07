import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/site-url";
import {
  getAllCategoryKeys,
  getAllProductSlugs,
  getAllJournalSlugs,
  getAllProjectSlugs,
  getJournalPosts,
} from "@/lib/data";

/**
 * `localePrefix` is `as-needed`, so the default locale sits at the root and
 * only the others carry a prefix. Getting this wrong would list URLs that 404.
 */
function localised(path: string, locale: string): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return `${siteUrl()}${prefix}${path}`;
}

/** Every locale of one path, as the `alternates.languages` map Google reads. */
function languages(path: string): Record<string, string> {
  return Object.fromEntries(routing.locales.map((l) => [l, localised(path, l)]));
}

function entry(
  path: string,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority: number,
  lastModified?: string
): MetadataRoute.Sitemap[number] {
  return {
    url: localised(path, routing.defaultLocale),
    ...(lastModified ? { lastModified } : {}),
    changeFrequency,
    priority,
    alternates: { languages: languages(path) },
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  // Journal posts carry a real publication date; nothing else does, and a
  // build timestamp would just tell crawlers every page changed on every
  // deploy, which is worse than saying nothing.
  const postDates = new Map(
    getJournalPosts(routing.defaultLocale).map((p) => [p.slug, p.date])
  );

  return [
    entry("", "monthly", 1),
    entry("/products", "weekly", 0.9),
    ...getAllCategoryKeys().map((key) => entry(`/collections/${key}`, "weekly", 0.8)),
    ...getAllProductSlugs().map((slug) => entry(`/products/${slug}`, "monthly", 0.8)),
    entry("/projects", "monthly", 0.7),
    ...getAllProjectSlugs().map((slug) => entry(`/projects/${slug}`, "yearly", 0.6)),
    entry("/journal", "weekly", 0.7),
    ...getAllJournalSlugs().map((slug) =>
      entry(`/journal/${slug}`, "yearly", 0.6, postDates.get(slug))
    ),
    entry("/about", "yearly", 0.6),
    entry("/contact", "yearly", 0.5),
    entry("/privacy", "yearly", 0.2),
  ];
}
