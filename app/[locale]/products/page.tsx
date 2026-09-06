import type { Metadata } from "next";
import { alternates } from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SectionHeading } from "@/components/shared/section-heading";
import { ALL, Catalogue } from "@/sections/products/catalogue";
import { getAllCategoryKeys, getProducts } from "@/lib/data";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.products" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: alternates("/products", locale),
  };
}

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "products" });

  return (
    <div className="container-fluid pb-24 pt-32 md:pb-32 md:pt-40">
      <SectionHeading
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        className="mb-14 max-w-2xl"
        entrance="none"
        as="h1"
      />
      <Catalogue
        locale={locale as AppLocale}
        products={getProducts(locale as AppLocale)}
        categories={getAllCategoryKeys()}
        active={ALL}
      />
    </div>
  );
}
