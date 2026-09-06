"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Product } from "@/types/product";
import { formatPrice } from "@/lib/data";
import type { AppLocale } from "@/i18n/routing";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const t = useTranslations("product");
  const locale = useLocale() as AppLocale;
  const price = formatPrice(product.price, product.currency, locale);

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <motion.div
        className="relative aspect-[4/5] overflow-hidden bg-muted"
        whileHover="hover"
      >
        <motion.div
          variants={{ hover: { scale: 1.05 } }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative h-full w-full"
        >
          <Image
            src={product.heroImage}
            alt={product.name}
            fill
            priority={priority}
            sizes="(max-width: 768px) 90vw, (max-width: 1200px) 45vw, 30vw"
            className="object-cover"
          />
        </motion.div>
        {product.isNew && (
          <span className="absolute left-4 top-4 rounded-full bg-warmwhite/90 px-3 py-1 text-[0.65rem] font-medium tracking-widest text-charcoal">
            {t("new")}
          </span>
        )}
        <motion.div
          variants={{ hover: { opacity: 1 } }}
          initial={{ opacity: 0 }}
          className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/30 to-transparent px-5 py-4"
        >
          <span className="text-xs font-medium tracking-wide text-warmwhite">
            {t("viewDetails")}
          </span>
        </motion.div>
      </motion.div>
      {/* stacked in the narrow two-column mobile grid, side by side once there is room */}
      <div className="mt-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
        <div>
          <p className="font-heading text-base text-foreground md:text-lg">{product.name}</p>
          {/* The designer is not always known — a supplier's catalogue gives a
              model and a category and often nothing else — and a category
              followed by a lone middot reads as a name that failed to load. */}
          <p className="mt-1 text-xs text-muted-foreground">
            {product.designer.name ? `${product.category} · ${product.designer.name}` : product.category}
          </p>
        </div>
        {price && (
          <p className="whitespace-nowrap text-sm text-muted-foreground">{price}</p>
        )}
      </div>
    </Link>
  );
}
