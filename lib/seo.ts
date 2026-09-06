import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

/**
 * The canonical address of a page and where its other language lives.
 *
 * A bilingual site that says neither is asking search engines to guess which
 * of two near-identical pages is the one to show, and to whom. The sitemap
 * carried this already; the pages themselves said nothing, and the sitemap is
 * the weaker signal of the two.
 *
 * `localePrefix` is `as-needed`, so the default locale sits at the root and
 * only the others carry a prefix — the same rule the sitemap follows, kept
 * here in one place rather than spelled out at each call.
 */
export function alternates(path: string, locale: string): Metadata["alternates"] {
  const at = (l: string) => `${l === routing.defaultLocale ? "" : `/${l}`}${path}` || "/";
  return {
    // The page's own address, not the default locale's: the English page is
    // its own page, not a copy of the Chinese one.
    canonical: at(locale),
    languages: {
      ...Object.fromEntries(routing.locales.map((l) => [l, at(l)])),
      "x-default": at(routing.defaultLocale),
    },
  };
}
