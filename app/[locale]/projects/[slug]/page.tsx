import type { Metadata } from "next";
import { alternates } from "@/lib/seo";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/motion/reveal";
import { getAllProjectSlugs, getProjectBySlug } from "@/lib/data";
import type { AppLocale } from "@/i18n/routing";

export function generateStaticParams() {
  return getAllProjectSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const project = getProjectBySlug(locale as AppLocale, slug);
  if (!project) return {};
  return {
    title: project.title,
    description: project.description,
    alternates: alternates(`/projects/${slug}`, locale),
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "projectsPage" });
  const project = getProjectBySlug(locale as AppLocale, slug);
  if (!project) notFound();

  return (
    <div className="pb-24 md:pb-32">
      <section className="relative flex h-[70vh] min-h-[480px] items-end overflow-hidden bg-charcoal">
        <Image src={project.coverImage} alt={project.title} fill priority className="object-cover opacity-80" />
        <div className="container-fluid relative z-10 pb-14 text-warmwhite">
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-warmwhite/70">
            {project.category} · {project.year}
          </p>
          <h1 className="max-w-2xl font-heading text-4xl font-light leading-tight md:text-5xl">
            {project.title}
          </h1>
          <p className="mt-3 text-sm text-warmwhite/80">{project.location}</p>
        </div>
      </section>

      <section className="container-fluid py-16 md:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-base leading-relaxed text-muted-foreground md:text-lg">{project.description}</p>
        </Reveal>
      </section>

      <section className="container-fluid grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        {project.gallery.map((img, i) => (
          <Reveal key={img + i} delay={i * 0.06} className={i % 3 === 0 ? "md:col-span-2" : ""}>
            <div className={`relative overflow-hidden bg-muted ${i % 3 === 0 ? "aspect-[16/9]" : "aspect-[4/5]"}`}>
              <Image src={img} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
            </div>
          </Reveal>
        ))}
      </section>

      <section className="container-fluid mt-20 flex justify-center md:mt-28">
        <Link
          href="/projects"
          className="rounded-full border border-border px-6 py-3 text-xs font-medium tracking-wide text-foreground transition-colors hover:border-foreground"
        >
          {t("backToAll")}
        </Link>
      </section>
    </div>
  );
}
