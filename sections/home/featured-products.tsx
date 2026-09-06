"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SectionHeading } from "@/components/shared/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { ProductCoverflow } from "@/components/product/product-coverflow";
import { getProducts } from "@/lib/data";
import type { AppLocale } from "@/i18n/routing";

/** How many pieces "this season's selection" is. */
const FEATURED_COUNT = 14;

export function FeaturedProducts() {
  const t = useTranslations("home.featured");
  const locale = useLocale() as AppLocale;
  // A selection, evenly spaced through the catalogue so every category is in
  // it. It used to be the whole range, which was fine at eight pieces and is
  // not at a hundred and ninety-three: the carousel lays every card out at
  // once, so the home page was asking the browser for every product
  // photograph the site has before anyone had scrolled to see one of them.
  // Fourteen is what fits behind the card in view without that.
  const all = getProducts(locale);
  const stride = Math.max(1, Math.floor(all.length / FEATURED_COUNT));
  const featured = all.filter((_, i) => i % stride === 0).slice(0, FEATURED_COUNT);

  return (
    // The neighbouring cards are meant to run off both edges, which on a phone
    // put them past the viewport and gave the whole page 90px of sideways
    // scroll. `clip` rather than `hidden`: hiding one axis forces the other to
    // `auto` and turns the section into a scroll container, which would break
    // any sticky element inside it. `clip` is the exception the spec allows.
    <section className="band-tint overflow-x-clip py-16 md:py-32">
      <div className="container-fluid">
        <div className="mb-10 flex flex-col items-start justify-between gap-6 md:mb-14 md:flex-row md:items-end">
          <SectionHeading
            eyebrow={t("eyebrow")}
            title={t("title")}
            description={t("description")}
          />
          <Link
            href="/products"
            className="whitespace-nowrap text-xs font-medium tracking-wide text-foreground underline-reveal"
          >
            {t("viewAll")}
          </Link>
        </div>
        <Reveal>
          <ProductCoverflow products={featured} />
        </Reveal>
      </div>
    </section>
  );
}
