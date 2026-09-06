"use client";

import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SectionHeading } from "@/components/shared/section-heading";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { getAllCategoryKeys, getProductsByCategory } from "@/lib/data";
import type { AppLocale } from "@/i18n/routing";

/**
 * A room photograph for each category.
 *
 * Chosen, not derived. The section's whole argument is that a piece belongs to
 * a scene, and a catalogue cut-out on white is not a scene — so these are the
 * in-situ shots rather than the product shots the grid below them uses.
 *
 * What this replaced reached into the product list for "the first sofa", "the
 * first armchair", "the first dining table" and "the first bed" — four
 * categories this catalogue does not have. Every lookup missed, every one fell
 * back to the same picture, and the section showed one chair four times over,
 * under four labels, linking to four pages that no longer exist.
 */
const CATEGORY_SCENE: Record<string, string> = {
  "dining-chair": "/images/lifestyle/dining-05.webp",
  "lounge-chair": "/images/lifestyle/lounge-06.webp",
  stool: "/images/lifestyle/lounge-03.webp",
  cabinet: "/images/lifestyle/cabinet-05.webp",
};

export function CollectionPreview() {
  const t = useTranslations("home.collectionPreview");
  const tCategories = useTranslations("categories");
  const locale = useLocale() as AppLocale;

  return (
    <section id="collection-preview" className="container-fluid py-16 md:py-32">
      <SectionHeading
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        className="mb-10 md:mb-14"
      />
      <RevealGroup className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {getAllCategoryKeys().map((key) => {
          // A category added later without a photograph of its own falls back
          // to its first piece rather than to nothing.
          const image = CATEGORY_SCENE[key] ?? getProductsByCategory(locale, key)[0]?.heroImage;
          if (!image) return null;
          const label = tCategories(key);
          return (
            <RevealItem key={key}>
              <Link href={`/collections/${key}`} className="group block">
                <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                  <Image
                    src={image}
                    alt={label}
                    fill
                    sizes="(max-width: 768px) 45vw, 22vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/50 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
                    <p className="font-heading text-base text-warmwhite md:text-xl">{label}</p>
                    <span className="mt-1 inline-block text-xs text-warmwhite/80 underline-reveal">
                      {t("viewCollection")}
                    </span>
                  </div>
                </div>
              </Link>
            </RevealItem>
          );
        })}
      </RevealGroup>
    </section>
  );
}
