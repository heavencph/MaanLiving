"use client";

import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { brand } from "@/lib/brand";
import { getProducts } from "@/lib/data";
import { MobileNav } from "@/components/layout/mobile-nav";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import type { AppLocale } from "@/i18n/routing";

export function Navbar() {
  const t = useTranslations("nav");
  const tCategories = useTranslations("categories");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  const products = getProducts(locale);
  const categories = Array.from(new Set(products.map((p) => p.categoryKey)));

  // One array feeds both the desktop row and the slide-in menu, so they
  // cannot drift apart.
  const NAV_LINKS = [
    { label: t("home"), href: "/" },
    { label: t("products"), href: "/products", mega: true },
    { label: t("about"), href: "/about" },
    { label: t("contact"), href: "/contact" },
  ];

  const solid = scrolled || mobileOpen;

  // reset transient menu state on navigation (React-recommended
  // "adjust state during render" pattern, avoids an extra effect + render)
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMegaOpen(false);
    setMobileOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-500",
        solid
          ? "bg-background/95 backdrop-blur-md border-b border-border"
          : "bg-transparent border-b border-transparent"
      )}
      onMouseLeave={() => setMegaOpen(false)}
    >
      <div className="container-fluid flex h-20 items-center justify-between md:h-24">
        <Link
          href="/"
          className="font-heading text-xl tracking-[0.18em] text-foreground transition-colors md:text-2xl"
        >
          {/* One text node, not `{brand.zh}{" "}` — that renders as two, with
              React's separator comment between them, for a space that is
              already part of the lockup. */}
          {`${brand.zh} `}
          <span className="font-sans text-[0.55em] tracking-[0.3em] align-middle">
            {brand.latin}
          </span>
        </Link>

        <nav className="hidden items-center gap-10 lg:flex">
          {NAV_LINKS.map((link) => (
            <div
              key={link.href}
              onMouseEnter={() => setMegaOpen(Boolean(link.mega))}
            >
              <Link
                href={link.href}
                className="underline-reveal text-[0.85rem] font-medium tracking-wide text-foreground/90 transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-4 text-foreground">
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>
          <Link
            href="/contact"
            className="hidden rounded-full border border-foreground/20 px-5 py-2 text-xs font-medium tracking-wide text-foreground transition-colors hover:bg-foreground hover:text-background md:inline-block"
          >
            {t("bookConsultation")}
          </Link>
          <button
            aria-label={t("openMenu")}
            onClick={() => setMobileOpen(true)}
            className="-mr-2 p-2 text-foreground lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {megaOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="hidden border-t border-border bg-background/98 backdrop-blur-md lg:block"
            onMouseEnter={() => setMegaOpen(true)}
          >
            <div className="container-fluid grid grid-cols-4 gap-10 py-10">
              <div className="col-span-1">
                <p className="mb-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {t("browseByCollection")}
                </p>
                <ul className="space-y-3">
                  {categories.map((cat) => (
                    <li key={cat}>
                      <Link
                        href={`/collections/${cat}`}
                        className="underline-reveal font-heading text-lg text-foreground"
                      >
                        {tCategories(cat)}
                      </Link>
                    </li>
                  ))}
                  <li className="pt-2">
                    <Link
                      href="/products"
                      className="text-xs font-medium tracking-wide text-muted-foreground underline-reveal"
                    >
                      {t("viewAllProducts")}
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="col-span-3 grid grid-cols-3 gap-6">
                {products.slice(0, 3).map((p) => (
                  <Link
                    key={p.id}
                    href={`/products/${p.slug}`}
                    className="group block"
                  >
                    {/* These are 300px wide and were being served as the
                        originals — 920KB of photograph for three thumbnails,
                        one of them 2000px across, pulled on every hover of
                        產品系列 on every page. */}
                    <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                      <Image
                        src={p.heroImage}
                        alt={p.name}
                        fill
                        // The menu is desktop only, so there is no small case.
                        sizes="25vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    </div>
                    <p className="mt-3 font-heading text-base text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.category}</p>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MobileNav
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        links={NAV_LINKS}
      />
    </header>
  );
}
