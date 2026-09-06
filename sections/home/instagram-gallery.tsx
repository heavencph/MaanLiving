import Image from "next/image";
import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/shared/section-heading";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { InstagramIcon } from "@/components/shared/social-icons";
import { stockGallery } from "@/lib/data";

const INSTAGRAM_PROFILE_URL = "https://www.instagram.com/_hvn.c/";

export function InstagramGallery() {
  const t = useTranslations("home.instagram");

  return (
    <section className="container-fluid py-16 md:py-32">
      <SectionHeading
        eyebrow={t("eyebrow")}
        title={t("title")}
        align="center"
        className="mx-auto max-w-2xl"
      />
      <RevealGroup className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-4 md:mt-14 md:gap-3">
        {stockGallery.map((g) => (
          <RevealItem key={g.id}>
            <a
              href={INSTAGRAM_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block aspect-square overflow-hidden bg-muted"
            >
              <Image
                src={g.image}
                alt={t("imageAlt")}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-charcoal/0 transition-colors duration-300 group-hover:bg-charcoal/30">
                <InstagramIcon className="h-6 w-6 text-warmwhite opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>
            </a>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
