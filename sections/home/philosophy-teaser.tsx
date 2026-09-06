import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/motion/reveal";

const IMG = "/images/lifestyle/dining-03.webp";

export function PhilosophyTeaser() {
  const t = useTranslations("home.philosophyTeaser");

  return (
    <section className="container-fluid grid grid-cols-1 items-center gap-8 py-16 md:gap-10 md:py-32 lg:grid-cols-2 lg:gap-20">
      <Reveal className="relative aspect-[4/5] overflow-hidden bg-muted lg:order-2">
        <Image src={IMG} alt={t("imageAlt")} fill sizes="(max-width: 1024px) 100vw, 45vw" className="object-cover" />
      </Reveal>
      <Reveal className="lg:order-1" delay={0.1}>
        <p className="mb-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {t("eyebrow")}
        </p>
        <h2 className="max-w-md font-heading text-3xl font-light leading-tight text-balance text-foreground md:text-4xl">
          {t("title1")}
          <br />
          {t("title2")}
        </h2>
        <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
          {t("description")}
        </p>
        {/* The philosophy is part of the about page now, so this points
            there rather than at a page that no longer exists. */}
        <Link
          href="/about"
          className="mt-8 inline-block text-xs font-medium tracking-wide text-foreground underline-reveal"
        >
          {t("cta")}
        </Link>
      </Reveal>
    </section>
  );
}
