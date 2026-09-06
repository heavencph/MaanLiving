import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/product/product-card";
import type { Product } from "@/types/product";
import type { AppLocale } from "@/i18n/routing";

export const ALL = "all";

/**
 * The catalogue, filtered to one category or showing everything.
 *
 * A category is a page here, not a switch. It used to be `?category=` read on
 * the client, which meant the server sent the same HTML whatever you asked
 * for and the browser narrowed it down afterwards — so arriving on a category
 * cold showed the whole catalogue for as long as hydration took, up to a
 * second on a slow phone. Every category is now built ahead of time, arrives
 * already filtered, and is a link a person can send to someone.
 *
 * Nothing here is a client component: the filter is the route, so there is no
 * state to hold, and the chips are links rather than buttons.
 */
export async function Catalogue({
  locale,
  products,
  categories,
  active,
}: {
  locale: AppLocale;
  products: Product[];
  categories: string[];
  active: string;
}) {
  const t = await getTranslations({ locale, namespace: "product" });
  const tProducts = await getTranslations({ locale, namespace: "products" });
  const tCategories = await getTranslations({ locale, namespace: "categories" });

  return (
    <div>
      <nav
        aria-label={tProducts("title")}
        className="no-scrollbar mb-12 flex gap-2 overflow-x-auto"
      >
        {[ALL, ...categories].map((cat) => (
          <Link
            key={cat}
            href={cat === ALL ? "/products" : `/collections/${cat}`}
            aria-current={cat === active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-5 py-2 text-xs font-medium tracking-wide transition-colors",
              cat === active
                ? "border-foreground bg-foreground text-background"
                : "border-border text-foreground/80 hover:border-foreground/60"
            )}
          >
            {cat === ALL ? t("allCategories") : tCategories(cat)}
          </Link>
        ))}
      </nav>

      {/* No entrance animation on the grid. It holds the largest image on the
          page, and starting it transparent means the browser's own measure of
          when the page has arrived waits for an animation instead of a
          picture. Moving between categories is a page now, and pages here
          arrive at once. */}
      <div className="grid grid-cols-2 gap-6 md:grid-cols-3 md:gap-x-8 md:gap-y-14">
        {products.map((p, i) => (
          <ProductCard key={p.id} product={p} priority={i < 3} />
        ))}
      </div>

      {products.length === 0 && (
        <p className="py-24 text-center text-sm text-muted-foreground">{t("emptyCategory")}</p>
      )}
    </div>
  );
}
