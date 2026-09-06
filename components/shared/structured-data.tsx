import { siteUrl } from "@/lib/site-url";
import { brand, brandFull } from "@/lib/brand";
import type { Product } from "@/types/product";

/**
 * What the site tells a search engine about itself, in the vocabulary search
 * engines actually read.
 *
 * Everything here is already on the page in prose; this is the same facts in
 * schema.org terms, which is what turns a result into a brand panel or a
 * product card with a price and a picture rather than a blue line. Nothing is
 * asserted that the page does not show — no ratings, no stock, no invented
 * reviews.
 */
function Ld({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // The content is ours, built from our own data, not from anything a
      // visitor can put into the page.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationSchema({ description }: { description: string }) {
  const url = siteUrl();
  return (
    <Ld
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: brandFull,
        alternateName: brand.latin,
        url,
        logo: `${url}/icon.png`,
        description,
        sameAs: [brand.social.instagram],
      }}
    />
  );
}

export function ProductSchema({ product, locale }: { product: Product; locale: string }) {
  const url = siteUrl();
  const path = locale === "zh" ? "" : `/${locale}`;
  return (
    <Ld
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.shortDescription,
        image: [product.heroImage, ...product.gallery.map((g) => g.src)].map(
          (src) => `${url}${src}`
        ),
        url: `${url}${path}/products/${product.slug}`,
        category: product.category,
        brand: { "@type": "Brand", name: brandFull },
        ...(product.materials.length
          ? { material: product.materials.map((m) => m.title).join(", ") }
          : {}),
      }}
    />
  );
}
