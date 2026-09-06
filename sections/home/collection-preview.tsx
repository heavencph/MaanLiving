"use client";

import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SectionHeading } from "@/components/shared/section-heading";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { getProducts } from "@/lib/data";
import type { AppLocale } from "@/i18n/routing";

const CATEGORY_META: { key: string; labelKey: "categorySofa" | "categoryArmchair" | "categoryDining" | "categoryBedroom" }[] = [
  { key: "sofa", labelKey: "categorySofa" },
  { key: "armchair", labelKey: "categoryArmchair" },
  { key: "dining-table", labelKey: "categoryDining" },
  { key: "bed", labelKey: "categoryBedroom" },
];

export function CollectionPreview() {
  const t = useTranslations("home.collectionPreview");
  const locale = useLocale() as AppLocale;
  const products = getProducts(locale);

  function imageForCategory(categoryKey: string) {
    return products.find((p) => p.categoryKey === categoryKey)?.heroImage ?? products[0].heroImage;
  }

  return (
    <section id="collection-preview" className="container-fluid py-16 md:py-32">
      <SectionHeading
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        className="mb-10 md:mb-14"
      />
      <RevealGroup className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {CATEGORY_META.map((c) => (
          <RevealItem key={c.key}>
            <Link href={`/collections/${c.key}`} className="group block">
              <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                <Image
                  src={imageForCategory(c.key)}
                  alt={t(c.labelKey)}
                  fill
                  sizes="(max-width: 768px) 45vw, 22vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/50 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
                  <p className="font-heading text-base text-warmwhite md:text-xl">{t(c.labelKey)}</p>
                  <span className="mt-1 inline-block text-xs text-warmwhite/80 underline-reveal">
                    {t("viewCollection")}
                  </span>
                </div>
              </div>
            </Link>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
