import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Reveal } from "@/components/motion/reveal";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  return {
    title: t("title"),
    description: t("intro"),
    // A policy page has no business appearing in search results ahead of the
    // catalogue, but it must stay reachable.
    robots: { index: true, follow: true },
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "privacy" });
  const sections = t.raw("sections") as { heading: string; body: string[] }[];

  return (
    <div className="container-fluid py-32 md:py-40">
      <Reveal className="mx-auto max-w-2xl">
        <h1 className="font-heading text-3xl font-light leading-tight text-foreground md:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {t("updated")}
        </p>
        <p className="mt-8 text-sm leading-relaxed text-muted-foreground md:text-base">
          {t("intro")}
        </p>

        <div className="mt-12 space-y-10">
          {sections.map((s) => (
            <section key={s.heading}>
              <h2 className="font-heading text-xl text-foreground">{s.heading}</h2>
              {s.body.map((p, i) => (
                <p
                  key={i}
                  className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base"
                >
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
      </Reveal>
    </div>
  );
}
