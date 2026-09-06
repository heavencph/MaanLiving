import type { Metadata } from "next";
import { alternates } from "@/lib/seo";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SectionHeading } from "@/components/shared/section-heading";
import { EditorialGrid } from "@/components/shared/editorial-grid";
import { LiquidParagraph, LiquidText } from "@/components/motion/liquid-text";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.about" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: alternates("/about", locale),
  };
}

const GRID_IMAGES = [
  { image: "/images/products/yanceng-sideboard/insitu-1.jpg", span: "wide" as const },
  { image: "/images/products/jinggu-lounge-chair/insitu-2.jpg" },
  { image: "/images/products/chaoxi-coffee-table/insitu-1.jpg" },
  { image: "/images/products/shanxing-dining-table/insitu-2.jpg", span: "wide" as const },
];

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "about" });
  const milestones = t.raw("milestones") as { year: string; text: string }[];
  const values = t.raw("values") as { title: string; text: string }[];
  const principles = t.raw("principles") as { title: string; body: string }[];

  return (
    <div>
      <section className="relative flex h-[60vh] min-h-[420px] items-end overflow-hidden bg-charcoal">
        <Image
          src="/images/products/yuefeng-sofa/insitu-3.jpg"
          alt={t("studioAlt")}
          fill
          priority
          className="object-cover opacity-70"
        />
        <div className="container-fluid relative z-10 pb-16">
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-warmwhite/70">{t("eyebrow")}</p>
          <h1 className="max-w-2xl font-heading text-4xl font-light leading-tight text-warmwhite md:text-5xl lg:text-6xl">
            {t("title1")}
            <br />
            {t("title2")}
          </h1>
        </div>
      </section>

      {/* Everything from here down resolves out of a liquid blur on scroll
          instead of fading up. The filter these blocks reference is rendered
          once in the root layout. */}

      {/* One centred column from here down, everything stacked on a single
          left axis. `max-w-3xl` is set for the measure rather than the look:
          it holds the enlarged body copy near 35 Chinese characters a line,
          and English near 70, which is where both stay comfortable to read at
          length. Wider would undo the enlargement by making the lines harder
          to track back. */}
      <section className="container-fluid py-32 md:py-48">
        <div className="mx-auto max-w-3xl">
          <LiquidText>
            <p className="mb-5 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {t("storyEyebrow")}
            </p>
            <h2 className="font-heading text-4xl font-light leading-[1.2] text-foreground md:text-5xl">
              {t("storyTitle1")}
              <br />
              {t("storyTitle2")}
            </h2>
          </LiquidText>

          {/* Line by line rather than a paragraph at a time, so the
              resolution travels down the page at reading speed. */}
          <div className="mt-14 space-y-9 md:mt-20 md:space-y-11">
            {[t("storyP1"), t("storyP2"), t("storyP3")].map((paragraph) => (
              <LiquidParagraph
                key={paragraph.slice(0, 24)}
                text={paragraph}
                className="text-lg leading-[1.85] text-muted-foreground md:text-[1.375rem]"
              />
            ))}
          </div>
        </div>
      </section>

      {/* The design philosophy, which used to be a page of its own. It is the
          same voice as the story above and was being read by fewer people for
          sitting behind another click, so it is here, in this column, under
          the same resolve. Its materials panel and every photograph that came
          with it are gone rather than moved: the panel was four product shots
          standing in for materials nobody has photographed yet, and this page
          reads as one unbroken column of type. */}
      <section className="container-fluid py-32 md:py-48">
        <div className="mx-auto max-w-3xl">
          <LiquidText>
            <p className="mb-5 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {t("philosophyEyebrow")}
            </p>
            <h2 className="font-heading text-4xl font-light leading-[1.2] text-foreground md:text-5xl">
              {t("philosophyTitle1")}
              <br />
              {t("philosophyTitle2")}
            </h2>
          </LiquidText>

          <div className="mt-14 md:mt-20">
            <LiquidParagraph
              text={t("philosophyIntro")}
              className="text-lg leading-[1.85] text-muted-foreground md:text-[1.375rem]"
            />
          </div>

          {/* Set like the values below rather than the timeline above: three
              principles that hold at once, so no numbers and no rules. The
              page they came from numbered them 01 to 03, which claimed an
              order they do not have. */}
          <div className="mt-16 space-y-16 md:mt-24 md:space-y-24">
            {principles.map((p) => (
              <div key={p.title}>
                <LiquidText blur={0.11}>
                  <p className="font-heading text-2xl font-light leading-tight text-foreground md:text-3xl">
                    {p.title}
                  </p>
                </LiquidText>
                <LiquidParagraph
                  text={p.body}
                  className="mt-5 text-lg leading-[1.85] text-muted-foreground md:mt-6 md:text-[1.375rem]"
                />
              </div>
            ))}
          </div>

          {/* The closing line of the philosophy, kept on the column's own axis
              rather than centred as it was: this page has one left edge and a
              centred block would read as a pull-quote lifted from somewhere
              else. */}
          <div className="mt-24 border-t border-border pt-16 md:mt-32 md:pt-20">
            <LiquidText blur={0.11}>
              <p className="font-heading text-2xl font-light italic leading-[1.5] text-foreground md:text-3xl">
                {t("quoteLine1")}
                <br />
                {t("quoteLine2")}
              </p>
            </LiquidText>
            <LiquidText blur={0.09}>
              <p className="mt-8 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {t("quoteAttribution")}
              </p>
            </LiquidText>
          </div>
        </div>
      </section>

      <section className="band-tint py-32 md:py-48">
        <div className="container-fluid">
          <div className="mx-auto max-w-3xl">
            <SectionHeading
              eyebrow={t("milestonesEyebrow")}
              title={t("milestonesTitle")}
              className="mb-20 md:mb-28"
              liquid
              size="display"
            />
            {/* The years sit above their line now, at display size. This
                section is the one place on the page where the order is real
                information, and the rules read as the ticks of a timeline. */}
            {milestones.map((m) => (
              <div
                key={m.year}
                className="border-t border-border pt-10 pb-14 md:pt-14 md:pb-20"
              >
                {/* Kept a step under the section title. Matched to it, the
                    years read as five rival headings and the section loses
                    its top. */}
                <LiquidText blur={0.11}>
                  <span className="block font-heading text-3xl font-light leading-none text-foreground md:text-4xl">
                    {m.year}
                  </span>
                </LiquidText>
                <LiquidParagraph
                  text={m.text}
                  className="mt-6 text-lg leading-[1.85] text-muted-foreground md:mt-8 md:text-[1.375rem]"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-fluid py-32 md:py-48">
        <div className="mx-auto max-w-3xl">
          <SectionHeading
            eyebrow={t("valuesEyebrow")}
            title={t("valuesTitle")}
            className="mb-20 md:mb-28"
            liquid
            size="display"
          />
          {/* No numbering here, unlike the timeline above — these four hold
              equally and in no order, and numbering them would claim a
              sequence that does not exist. */}
          <div className="space-y-16 md:space-y-24">
            {values.map((v) => (
              <div key={v.title}>
                <LiquidText blur={0.11}>
                  <p className="font-heading text-2xl font-light leading-tight text-foreground md:text-3xl">
                    {v.title}
                  </p>
                </LiquidText>
                <LiquidParagraph
                  text={v.text}
                  className="mt-5 text-lg leading-[1.85] text-muted-foreground md:mt-6 md:text-[1.375rem]"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-fluid pb-24 md:pb-32">
        <EditorialGrid items={GRID_IMAGES} />
      </section>
    </div>
  );
}
