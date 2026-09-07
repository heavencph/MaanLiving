/**
 * The brand itself: its name, how that name is set, and where it lives online.
 *
 * These are the strings that are not copy. Sentences about the brand belong in
 * `messages/{zh,en}.json`, where they can be translated; what is here is the
 * name as a piece of design — the navbar lockup, the footer, the curtain the
 * preloader knocks its letters out of, the wordmark on the share card, the
 * name a search engine files the site under.
 *
 * The rest of what makes this site look like this brand is deliberately not
 * here, because it already has one home each:
 *
 *   - colours   `app/[locale]/globals.css`, the ten tokens under `:root`
 *   - faces     `app/[locale]/layout.tsx`, the two `next/font` calls
 *   - domain    `NEXT_PUBLIC_SITE_URL`, read through `lib/site-url.ts`
 *   - products  `lib/data/*.json` and `public/images/products/`
 *   - CMS       `public/admin/config.yml` — YAML, so it cannot read this file;
 *               its `repo` and `base_url` are changed by hand
 *
 * `docs/rebrand.md` walks the whole list in order.
 */
export const brand = {
  /**
   * The brand as a filename: the marks in `public/brand` are named with it.
   * Lowercase, no spaces.
   */
  slug: "maan",
  /** The Chinese name. The navbar, the footer and the mobile drawer show it alone. */
  zh: "萬閣",
  /**
   * The Latin name. This brand sets it the same way everywhere — one word, no
   * space — so `latin` and `wordmark` hold the same string. They stay separate
   * fields because they are not the same idea: one is the name in a sentence,
   * the other is the mark, and a brand whose two differ (萬角 MAAN GOK, set as
   * MAANGOK) needs both.
   */
  latin: "MAAN",
  /** The name set as a mark. The preloader carves this out of the curtain. */
  wordmark: "MAAN",
  /**
   * The wordmark split for the hero marquee, which stretches it sixteen times
   * over — far enough that a convention nobody normally sees becomes visible:
   * round letters are drawn to overshoot the baseline so they read as the same
   * size as flat ones. Marking which runs are round lets that overshoot be
   * taken back out, so the band's bottom edge is straight. MAAN is four flat
   * letters with no curve among them, so it is one run and nothing to correct.
   * Concatenated, this has to spell `wordmark`.
   */
  wordmarkRuns: [{ text: "MAAN", round: false }],
  /**
   * Profiles the site links to, and tells search engines are the same brand.
   * Carried over from the first brand — point it at this one's account when
   * there is one, because `sameAs` is a claim that the profile *is* this
   * organisation, and two brands cannot both be it.
   */
  social: {
    instagram: "https://www.instagram.com/_hvn.c/",
  },
} as const;

/**
 * Chinese followed by Latin — the full name, for anything read rather than
 * looked at: the share card's alt text, structured data, a product's title.
 */
export const brandFull = `${brand.zh} ${brand.latin}`;
