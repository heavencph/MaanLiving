"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { brand } from "@/lib/brand";
import { getAllCategoryKeys } from "@/lib/data";
import { MobileNav } from "@/components/layout/mobile-nav";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export function Navbar() {
  const t = useTranslations("nav");
  const tCategories = useTranslations("categories");
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  const categories = getAllCategoryKeys();

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
            // Deep brown at 70%, so the page keeps showing through it. Warm
            // white on that reads at 5.3:1 over the site's own paper, which is
            // past the 4.5:1 a reader with low vision needs — the blur is what
            // keeps it there over a photograph rather than over the paper.
            className="hidden border-t border-warmwhite/15 bg-charcoal/70 backdrop-blur-md lg:block"
            onMouseEnter={() => setMegaOpen(true)}
          >
            {/* Four names and a link. It used to carry three product
                photographs beside them, which is a picture of the catalogue
                shown to someone who is on their way to the catalogue — so the
                menu is a row now rather than a panel, and it takes the height
                of one line instead of a card. */}
            <div className="container-fluid flex items-baseline gap-10 py-6">
              <p className="text-xs uppercase tracking-[0.2em] text-warmwhite/55">
                {t("browseByCollection")}
              </p>
              <ul className="flex flex-wrap items-baseline gap-x-9 gap-y-3">
                {categories.map((cat) => (
                  <li key={cat}>
                    <Link
                      href={`/collections/${cat}`}
                      className="underline-reveal font-heading text-lg text-warmwhite"
                    >
                      {tCategories(cat)}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/products"
                className="underline-reveal ml-auto text-xs font-medium tracking-wide text-warmwhite/70"
              >
                {t("viewAllProducts")}
              </Link>
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
