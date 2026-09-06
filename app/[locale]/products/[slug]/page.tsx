import type { Metadata } from "next";
import { alternates } from "@/lib/seo";
import { brandFull } from "@/lib/brand";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ProductDetailClient } from "@/components/product/product-detail-client";
import { RelatedProducts } from "@/sections/products/related-products";
import { ProductSchema } from "@/components/shared/structured-data";
import { getAllProductSlugs, getProductBySlug, getRelatedProducts } from "@/lib/data";
import type { AppLocale } from "@/i18n/routing";

export function generateStaticParams() {
  return getAllProductSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = getProductBySlug(locale as AppLocale, slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.shortDescription,
    alternates: alternates(`/products/${slug}`, locale),
    openGraph: {
      title: `${product.name} | ${brandFull}`,
      description: product.shortDescription,
      images: [product.heroImage],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const product = getProductBySlug(locale as AppLocale, slug);
  if (!product) notFound();

  const related = getRelatedProducts(locale as AppLocale, product);

  return (
    <div className="pb-24 md:pb-32">
      <ProductSchema product={product} locale={locale} />
      <ProductDetailClient product={product} />
      <div className="mt-24 md:mt-32">
        <RelatedProducts products={related} />
      </div>
    </div>
  );
}
