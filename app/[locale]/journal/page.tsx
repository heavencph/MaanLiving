import type { Metadata } from "next";
import { alternates } from "@/lib/seo";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SectionHeading } from "@/components/shared/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { getJournalPosts } from "@/lib/data";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.journal" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: alternates("/journal", locale),
  };
}

export default async function JournalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "journalPage" });
  const [featured, ...rest] = getJournalPosts(locale as AppLocale);

  return (
    <div className="pb-24 pt-32 md:pb-32 md:pt-40">
      <div className="container-fluid">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
          className="mb-16 max-w-2xl"
          entrance="none"
        as="h1"
      />

        {/* The featured post is the first thing on the page — nothing
            to scroll into, so nothing to reveal. */}
        <div>
          <Link href={`/journal/${featured.slug}`} className="group mb-20 grid grid-cols-1 gap-8 md:mb-24 md:grid-cols-2 md:gap-14 lg:items-center">
            <div className="relative aspect-[16/11] overflow-hidden bg-muted">
              <Image
                src={featured.coverImage}
                alt={featured.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                {featured.category} · {featured.date}
              </p>
              <h2 className="mt-4 font-heading text-2xl font-light leading-snug text-foreground md:text-3xl">
                {featured.title}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
                {featured.excerpt}
              </p>
              <span className="mt-6 inline-block text-xs font-medium tracking-wide text-foreground underline-reveal">
                {t("readMore")}
              </span>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((post, i) => (
            <Reveal key={post.id} delay={(i % 3) * 0.08}>
              <Link href={`/journal/${post.slug}`} className="group block">
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  <Image
                    src={post.coverImage}
                    alt={post.title}
                    fill
                    sizes="(max-width: 768px) 90vw, 30vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </div>
                <p className="mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {post.category} · {post.readTime}
                </p>
                <p className="mt-2 font-heading text-lg leading-snug text-foreground">{post.title}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
