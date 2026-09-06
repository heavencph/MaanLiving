import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { InstagramIcon, FacebookIcon } from "@/components/shared/social-icons";
import { brand } from "@/lib/brand";

export function Footer() {
  const t = useTranslations("footer");

  const FOOTER_LINKS = [
    {
      title: t("groupProducts"),
      links: [
        { label: t("linkSofa"), href: "/collections/sofa" },
        { label: t("linkDiningSet"), href: "/collections/dining-table" },
        { label: t("linkArmchair"), href: "/collections/armchair" },
        { label: t("linkBedroom"), href: "/collections/bed" },
        { label: t("linkAllProducts"), href: "/products" },
      ],
    },
    {
      title: t("groupBrand"),
      links: [
        { label: t("linkAbout"), href: "/about" },
        { label: t("linkProjects"), href: "/projects" },
        { label: t("linkJournal"), href: "/journal" },
      ],
    },
    {
      title: t("groupServices"),
      links: [
        { label: t("linkContact"), href: "/contact" },
        { label: t("linkBookConsultation"), href: "/contact" },
        { label: t("linkCustomService"), href: "/contact" },
        { label: t("linkCareWarranty"), href: "/contact" },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-warmwhite">
      <div className="container-fluid grid grid-cols-2 gap-10 py-16 md:grid-cols-6 md:py-24">
        <div className="col-span-2 md:col-span-2">
          <p className="font-heading text-2xl tracking-[0.18em] text-foreground">{brand.zh}</p>
          <p className="mt-1 text-xs tracking-[0.3em] text-muted-foreground">{brand.latin}</p>
          <p className="mt-6 max-w-xs text-sm leading-relaxed text-muted-foreground">{t("description")}</p>
          <div className="mt-6 flex gap-4">
            <a
              href={brand.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            >
              <InstagramIcon className="h-4 w-4" />
            </a>
            <a
              href="#"
              aria-label="Facebook"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            >
              <FacebookIcon className="h-4 w-4" />
            </a>
          </div>
        </div>

        {FOOTER_LINKS.map((group) => (
          <div key={group.title} className="col-span-1">
            <p className="mb-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {group.title}
            </p>
            <ul className="space-y-3">
              {group.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="underline-reveal text-sm text-foreground/80 hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* No showroom column: the address was placeholder copy, and opening
            hours under a heading that names a place we cannot point to are
            worse than nothing. */}
      </div>

      <div className="border-t border-border py-6">
        <div className="container-fluid flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground md:flex-row">
          <p>{t("copyright", { year: new Date().getFullYear() })}</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="underline-reveal hover:text-foreground">
              {t("privacy")}
            </Link>
            {/* No terms link until the document exists — it pointed at the home
                page, which is worse than not offering it. */}
          </div>
        </div>
      </div>
    </footer>
  );
}
