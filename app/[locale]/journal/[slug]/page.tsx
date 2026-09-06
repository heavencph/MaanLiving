import type { Metadata } from "next";
import { alternates } from "@/lib/seo";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/motion/reveal";
import { getAllJournalSlugs, getJournalPostBySlug, getJournalPosts } from "@/lib/data";
import type { AppLocale } from "@/i18n/routing";

export function generateStaticParams() {
  return getAllJournalSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getJournalPostBySlug(locale as AppLocale, slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    alternates: alternates(`/journal/${slug}`, locale),
  };
}

export default async function JournalPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "journalPage" });
  const post = getJournalPostBySlug(locale as AppLocale, slug);
  if (!post) notFound();

  const more = getJournalPosts(locale as AppLocale).filter((p) => p.id !== post.id).slice(0, 2);

  return (
    <article className="pb-24 pt-32 md:pb-32 md:pt-40">
      <div className="container-fluid">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            {post.category} · {post.date} · {post.readTime}
          </p>
          <h1 className="mt-5 font-heading text-3xl font-light leading-tight text-balance text-foreground md:text-4xl lg:text-5xl">
            {post.title}
          </h1>
          <p className="mt-5 text-sm text-muted-foreground">{t("writtenBy", { author: post.author })}</p>
        </Reveal>

        <Reveal delay={0.1} className="relative mx-auto mt-12 aspect-[16/9] max-w-4xl overflow-hidden bg-muted">
          <Image src={post.coverImage} alt={post.title} fill sizes="(max-width: 1024px) 100vw, 900px" className="object-cover" priority />
        </Reveal>

        <div className="mx-auto mt-14 max-w-2xl space-y-6">
          {post.content.map((p, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <p className="text-base leading-loose text-foreground/85">{p}</p>
            </Reveal>
          ))}
        </div>

        {more.length > 0 && (
          <div className="mx-auto mt-24 max-w-3xl border-t border-border pt-14 md:mt-32">
            <p className="mb-8 text-xs uppercase tracking-[0.25em] text-muted-foreground">{t("furtherReading")}</p>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              {more.map((p) => (
                <Link key={p.id} href={`/journal/${p.slug}`} className="group block">
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <Image src={p.coverImage} alt={p.title} fill sizes="(max-width: 768px) 90vw, 40vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                  <p className="mt-3 font-heading text-lg text-foreground">{p.title}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
