"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ProductGallery } from "@/components/product/product-gallery";
import { ColourConfigurator } from "@/components/product/colour-configurator";
import { VariantSelector } from "@/components/product/variant-selector";
import { SpecAccordion } from "@/components/product/spec-accordion";
import { formatPrice } from "@/lib/data";
import type { Product } from "@/types/product";
import type { AppLocale } from "@/i18n/routing";

export function ProductDetailClient({ product }: { product: Product }) {
  const t = useTranslations("product");
  const locale = useLocale() as AppLocale;
  const price = formatPrice(product.price, product.currency, locale);
  const [colour, setColour] = useState(product.variants.colours[0]);
  const [sizeId, setSizeId] = useState(product.variants.sizes?.[0]?.id ?? "");
  const [legId, setLegId] = useState(product.variants.legFinishes?.[0]?.id ?? "");

  const selectedSize = product.variants.sizes?.find((s) => s.id === sizeId);

  // Every one of the accordion's sections is optional, and a new piece often
  // has none of them yet. All empty, the block is a horizontal rule over five
  // headings that open onto nothing.
  const hasSpecs =
    product.description.length > 0 ||
    product.dimensions.length > 0 ||
    product.materials.length > 0 ||
    product.downloads.length > 0 ||
    Boolean(product.designer.name);

  // The hero shot is usually also the first gallery entry, so the strip used
  // to open on the same photograph twice. Harmless at six images; at one it is
  // the whole strip.
  const galleryImages = useMemo(() => {
    const seen = new Set<string>();
    return [{ src: product.heroImage, kind: "studio" as const }, ...product.gallery].filter(
      (img) => {
        if (seen.has(img.src)) return false;
        seen.add(img.src);
        return true;
      }
    );
  }, [product]);

  // One colour is not a choice. A piece that comes in a single finish says so
  // and shows its one photograph; it does not offer a picker with nothing to
  // pick, and it does not feed the gallery an override of a shot already in
  // it. Products arrive with one colour long before they arrive with six.
  const hasColourChoice = product.variants.colours.length > 1;

  return (
    <div>
      <div className="container-fluid grid grid-cols-1 gap-10 pt-28 md:pt-32 lg:grid-cols-[1fr_420px] lg:gap-16">
        {/* gallery */}
        <ProductGallery
          images={galleryImages}
          activeOverrideImage={hasColourChoice ? colour.image : undefined}
          activeOverrideLabel={hasColourChoice ? colour.name : undefined}
          productName={product.name}
        />

        {/* sticky info panel */}
        <div className="lg:sticky lg:top-28 lg:h-fit">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            {product.category}
          </p>
          <h1 className="mt-2 font-heading text-3xl font-light leading-tight text-foreground md:text-4xl">
            {product.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{product.nameAlt}</p>
          <p className="mt-5 text-sm leading-relaxed text-foreground/80">
            {product.shortDescription}
          </p>
          {price && <p className="mt-5 font-heading text-2xl text-foreground">{price}</p>}

          <div className="mt-8 space-y-7 border-t border-border pt-7">
            {hasColourChoice ? (
              <ColourConfigurator
                colours={product.variants.colours}
                selected={colour}
                onChange={setColour}
                label={product.variants.fabrics ? t("fabricColour") : t("colourWood")}
              />
            ) : (
              <div className="flex items-baseline justify-between">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {product.variants.fabrics ? t("fabricColour") : t("colourWood")}
                </p>
                <p className="font-heading text-base text-foreground">{colour.name}</p>
              </div>
            )}

            {product.variants.sizes && (
              <VariantSelector
                label={t("size")}
                options={product.variants.sizes.map((s) => ({ id: s.id, label: s.label }))}
                selectedId={sizeId}
                onChange={setSizeId}
              />
            )}

            {product.variants.legFinishes && (
              <VariantSelector
                label={t("legBase")}
                options={product.variants.legFinishes.map((l) => ({ id: l.id, label: l.name }))}
                selectedId={legId}
                onChange={setLegId}
              />
            )}

            {selectedSize && (
              <p className="text-xs text-muted-foreground">
                {t("selectedSize", { dimensions: selectedSize.dimensions })}
              </p>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <motion.button
              whileTap={{ scale: 0.98 }}
              className="w-full rounded-full bg-foreground py-4 text-sm font-medium tracking-wide text-background transition-opacity hover:opacity-90"
            >
              {t("bookConsultation")}
            </motion.button>
            <Link
              href="/contact"
              className="w-full rounded-full border border-border py-4 text-center text-sm font-medium tracking-wide text-foreground transition-colors hover:border-foreground"
            >
              {t("addToWishlist")}
            </Link>
          </div>

          {hasSpecs && (
          <div className="mt-10 border-t border-border pt-8">
            <SpecAccordion
              description={product.description}
              dimensions={product.dimensions}
              materials={product.materials}
              downloads={product.downloads}
              designer={product.designer}
            />
          </div>
          )}
        </div>
      </div>

      {/* mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t border-border bg-background/95 px-5 py-3 backdrop-blur-md lg:hidden">
        <div>
          <p className="font-heading text-base text-foreground">{product.name}</p>
          {price && <p className="text-xs text-muted-foreground">{price}</p>}
        </div>
        <button className="rounded-full bg-foreground px-6 py-3 text-xs font-medium tracking-wide text-background">
          {t("bookConsultationShort")}
        </button>
      </div>
    </div>
  );
}
