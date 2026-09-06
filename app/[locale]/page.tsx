import type { Metadata } from "next";
import { alternates } from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Hero } from "@/sections/home/hero";
import { CollectionPreview } from "@/sections/home/collection-preview";
import { FeaturedProducts } from "@/sections/home/featured-products";
import { PhilosophyTeaser } from "@/sections/home/philosophy-teaser";
import { ProjectsSection } from "@/sections/home/projects-section";
import { InstagramGallery } from "@/sections/home/instagram-gallery";
import { OrganizationSchema } from "@/components/shared/structured-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.home" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: alternates("", locale),
  };
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "meta" });

  return (
    <>
      <OrganizationSchema description={t("siteDescription")} />
      <Hero />
      <FeaturedProducts />
      <CollectionPreview />
      <PhilosophyTeaser />
      <ProjectsSection />
      <InstagramGallery />
    </>
  );
}
