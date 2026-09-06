import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/shared/section-heading";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { ProductCard } from "@/components/product/product-card";
import type { Product } from "@/types/product";

export function RelatedProducts({ products }: { products: Product[] }) {
  const t = useTranslations("product");
  if (products.length === 0) return null;
  return (
    <section className="band-tint py-24 md:py-32">
      <div className="container-fluid">
        <SectionHeading eyebrow={t("youMayAlsoLike")} title={t("relatedProducts")} className="mb-12" />
        <RevealGroup className="grid grid-cols-2 gap-6 md:grid-cols-3 md:gap-8">
          {products.map((p) => (
            <RevealItem key={p.id}>
              <ProductCard product={p} />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
