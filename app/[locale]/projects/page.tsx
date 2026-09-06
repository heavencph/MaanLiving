import type { Metadata } from "next";
import { alternates } from "@/lib/seo";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SectionHeading } from "@/components/shared/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { getProjects } from "@/lib/data";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.projects" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: alternates("/projects", locale),
  };
}

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "projectsPage" });
  const projects = getProjects(locale as AppLocale);

  return (
    <div className="container-fluid pb-24 pt-32 md:pb-32 md:pt-40">
      <SectionHeading
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        className="mb-16 max-w-2xl"
        entrance="none"
        as="h1"
      />
      <div className="grid grid-cols-1 gap-x-8 gap-y-16 md:grid-cols-2">
        {/* The first row is on screen before anything is scrolled, so it is
            not wrapped in a reveal — the fade starts at zero opacity and that
            zero is in the served HTML, which would leave the page blank until
            its JavaScript arrives. */}
        {projects.map((p, i) => {
          const onScreenAtLoad = i < 2;
          const card = (
            <Link href={`/projects/${p.slug}`} className="group block">
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <Image
                  src={p.coverImage}
                  alt={p.title}
                  fill
                  priority={onScreenAtLoad}
                  sizes="(max-width: 768px) 90vw, 45vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>
              <div className="mt-5 flex items-start justify-between gap-4">
                <div>
                  <p className="font-heading text-2xl text-foreground">{p.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{p.location}</p>
                </div>
                <span className="whitespace-nowrap text-xs uppercase tracking-widest text-muted-foreground">
                  {p.category} · {p.year}
                </span>
              </div>
            </Link>
          );
          return onScreenAtLoad ? (
            <div key={p.id}>{card}</div>
          ) : (
            <Reveal key={p.id} delay={(i % 2) * 0.1}>
              {card}
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
