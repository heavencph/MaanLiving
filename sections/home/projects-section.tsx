import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SectionHeading } from "@/components/shared/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { getProjects } from "@/lib/data";
import type { AppLocale } from "@/i18n/routing";

export function ProjectsSection() {
  const t = useTranslations("home.projects");
  const locale = useLocale() as AppLocale;
  const featured = getProjects(locale).slice(0, 3);

  return (
    <section className="band-tint py-16 md:py-32">
      <div className="container-fluid">
        <div className="mb-10 flex flex-col items-start justify-between gap-6 md:mb-14 md:flex-row md:items-end">
          <SectionHeading
            eyebrow={t("eyebrow")}
            title={t("title")}
            description={t("description")}
          />
          <Link href="/projects" className="whitespace-nowrap text-xs font-medium tracking-wide text-foreground underline-reveal">
            {t("viewAll")}
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {featured.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.1}>
              <Link href={`/projects/${p.slug}`} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                  <Image
                    src={p.coverImage}
                    alt={p.title}
                    fill
                    sizes="(max-width: 768px) 90vw, 30vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </div>
                <p className="mt-4 font-heading text-lg text-foreground">{p.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.location} · {p.year}
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
