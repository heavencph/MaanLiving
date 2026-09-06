import type { Metadata } from "next";
import { alternates } from "@/lib/seo";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SectionHeading } from "@/components/shared/section-heading";
import { Catalogue } from "@/sections/products/catalogue";
import { getAllCategoryKeys, getProductsByCategory } from "@/lib/data";
import { routing, type AppLocale } from "@/i18n/routing";

/**
 * One page per category, built ahead of time.
 *
 * The site calls these collections in its own menu, and that is what they are:
 * a page with its own address, its own title, and the pieces that belong to it
 * already on it. As a query on the catalogue they were none of those things —
 * one address for eight different pages, none of which a search engine could
 * tell apart, and each of which arrived showing the wrong products until the
 * browser caught up.
 */
export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    getAllCategoryKeys().map((category) => ({ locale, category }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}): Promise<Metadata> {
  const { locale, category } = await params;
  if (!getAllCategoryKeys().includes(category)) return {};
  const tCategories = await getTranslations({ locale, namespace: "categories" });
  const t = await getTranslations({ locale, namespace: "collection" });
  const name = tCategories(category);
  return {
    title: t("metaTitle", { category: name }),
    description: t("metaDescription", { category: name }),
    alternates: alternates(`/collections/${category}`, locale),
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale, category } = await params;
  if (!getAllCategoryKeys().includes(category)) notFound();
  setRequestLocale(locale);

  const tCategories = await getTranslations({ locale, namespace: "categories" });
  const t = await getTranslations({ locale, namespace: "collection" });
  const name = tCategories(category);

  return (
    <div className="container-fluid pb-24 pt-32 md:pb-32 md:pt-40">
      <SectionHeading
        eyebrow={t("eyebrow")}
        title={name}
        description={t("description", { category: name })}
        className="mb-14 max-w-2xl"
        entrance="none"
        as="h1"
      />
      <Catalogue
        locale={locale as AppLocale}
        products={getProductsByCategory(locale as AppLocale, category)}
        categories={getAllCategoryKeys()}
        active={category}
      />
    </div>
  );
}
