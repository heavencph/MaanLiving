import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ProductCard } from "@/components/product/product-card";
import { getAllCategoryKeys, getProductsByCategory } from "@/lib/data";
import type { AppLocale } from "@/i18n/routing";

/** How many pieces of a category the overview shows before sending you to it. */
const PREVIEW = 8;

/**
 * The catalogue's front door: every category on one page, each with a few of
 * its pieces and a count.
 *
 * The range is nearly two hundred pieces across four categories, and a flat
 * grid of all of them answers the wrong question. Someone arriving wants to
 * know what kinds of thing are made here before they want to see the
 * hundred-and-twelfth dining chair — so the page is a page of categories, and
 * the category pages are where the whole of one gets shown.
 */
export async function CategoryOverview({ locale }: { locale: AppLocale }) {
  const t = await getTranslations({ locale, namespace: "products" });
  const tCategories = await getTranslations({ locale, namespace: "categories" });
  const keys = getAllCategoryKeys();

  return (
    <div>
      <nav aria-label={t("title")} className="no-scrollbar mb-14 flex gap-2 overflow-x-auto">
        {keys.map((key) => (
          <Link
            key={key}
            href={`/collections/${key}`}
            className="shrink-0 rounded-full border border-border px-5 py-2 text-xs font-medium tracking-wide text-foreground/80 transition-colors hover:border-foreground/60"
          >
            {tCategories(key)}
          </Link>
        ))}
      </nav>

      <div className="space-y-20 md:space-y-28">
        {keys.map((key, section) => {
          const items = getProductsByCategory(locale, key);
          const shown = items.slice(0, PREVIEW);
          return (
            <section key={key}>
              <div className="mb-8 flex items-end justify-between gap-6 border-b border-border pb-4">
                <div>
                  <h2 className="font-heading text-2xl font-light leading-tight text-foreground md:text-3xl">
                    {tCategories(key)}
                  </h2>
                  <p className="mt-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">
                    {t("count", { count: items.length })}
                  </p>
                </div>
                {items.length > shown.length && (
                  <Link
                    href={`/collections/${key}`}
                    className="underline-reveal shrink-0 pb-1 text-xs font-medium tracking-wide text-foreground"
                  >
                    {t("viewAll", { count: items.length })}
                  </Link>
                )}
              </div>

              {/* No entrance animation: the first row of the first category is
                  the largest thing on the page, and starting it transparent
                  would make the browser's own measure of when the page has
                  arrived wait for an animation instead of a picture. */}
              <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-x-8 md:gap-y-12">
                {shown.map((p, i) => (
                  <ProductCard key={p.id} product={p} priority={section === 0 && i < 4} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
