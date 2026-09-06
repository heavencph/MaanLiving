"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SectionHeading } from "@/components/shared/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { ProductCoverflow } from "@/components/product/product-coverflow";
import { getProducts } from "@/lib/data";
import type { AppLocale } from "@/i18n/routing";

export function FeaturedProducts() {
  const t = useTranslations("home.featured");
  const locale = useLocale() as AppLocale;
  // The whole range rather than the four the grid showed: a carousel is worth
  // dragging only if there is something behind the card in view, and with
  // eight pieces in the catalogue "this season's selection" still holds.
  const featured = [...getProducts(locale)].sort((a, b) => Number(b.isNew) - Number(a.isNew));

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
