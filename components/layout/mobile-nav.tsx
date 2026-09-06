"use client";

import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { brand } from "@/lib/brand";

interface NavLink {
  label: string;
  href: string;
}

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  links: NavLink[];
}

export function MobileNav({ open, onClose, links }: MobileNavProps) {
  const t = useTranslations("nav");

  // no portal target while server-rendering; closed is also all the server
  // ever renders, so this costs nothing on the first paint
  if (typeof document === "undefined") return null;

  // Rendered into `body` rather than inline. The navbar it is called from
  // carries `backdrop-blur`, which makes the header a containing block for
  // fixed descendants — the panel's `inset-y-0` would resolve against the
  // 81px header instead of the viewport, leaving its background covering
  // only the top strip while the links spilled over the page below.
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-y-0 right-0 z-60 flex w-full max-w-sm flex-col bg-warmwhite px-8 py-8 lg:hidden"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mb-10 flex items-center justify-between">
              <span className="font-heading text-xl tracking-[0.18em]">{brand.zh}</span>
              <div className="flex items-center gap-3">
                <LanguageSwitcher variant="mobile" />
                <button aria-label={t("closeMenu")} onClick={onClose} className="p-2">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <nav className="flex flex-col gap-1">
              {links.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.4 }}
                >
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className="block border-b border-border py-4 font-heading text-2xl text-foreground"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </nav>
            <div className="mt-auto">
              <Link
                href="/contact"
                onClick={onClose}
                className="block w-full rounded-full bg-foreground px-6 py-3 text-center text-sm font-medium text-background"
              >
                {t("bookConsultation")}
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
