import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Inter, Noto_Sans_TC } from "next/font/google";
import "./globals.css";
import { routing } from "@/i18n/routing";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Preloader } from "@/components/layout/preloader";
import { LiquidDefs } from "@/components/motion/liquid-text";
import { siteUrl } from "@/lib/site-url";

// Two faces for the whole site. The serif pair that used to sit behind
// `font-heading` — Cormorant Garamond and Noto Serif SC — is gone rather than
// merely unreferenced, so neither is still fetched.
const inter = Inter({
  variable: "--font-body-latin",
  subsets: ["latin"],
  display: "swap",
});

// Source Han Sans, 思源黑體 — the Traditional cut, matching the `zh-Hant` the
// document declares and the copy it is set in. The two cuts draw shared
// characters to different regional standards, so the wrong one does not fail
// loudly: it quietly misspells a fraction of every Chinese sentence on the
// site to a reader who can tell. 漫家居 happens to be drawn the same either
// way, so the brand name is not what settles this — the other few thousand
// characters are.
//
// The weight list is deliberately short of the hero's: it sets its wordmark
// at 840 and its headline at 700, neither of which is loaded, and the
// browser's synthetic bold is what the marquee's width was tuned against.
//
// It is also short of a semibold. A CJK face is delivered as a set of files
// split by character range, and each weight has its own set — so an unused
// weight is not a line of configuration, it is a quarter of the largest thing
// the site downloads. Surveying every page for the weight of every rendered
// run of text: 4,479 characters at 400, 542 at 500, 260 at 300, and none at
// all at 600.
const notoSansTC = Noto_Sans_TC({
  variable: "--font-body-tc",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    metadataBase: new URL(siteUrl()),
    title: {
      default: t("siteTitleDefault"),
      template: t("siteTitleTemplate"),
    },
    description: t("siteDescription"),
    keywords: t.raw("keywords") as string[],
    openGraph: {
      title: t("siteTitleDefault"),
      description: t("ogDescription"),
      locale: locale === "zh" ? "zh_TW" : "en_US",
      type: "website",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "notFound" });

  return (
    <html
      lang={locale === "zh" ? "zh-Hant" : "en"}
      className={`${inter.variable} ${notoSansTC.variable} scroll-smooth`}
    >
      <body
        className="flex min-h-screen flex-col bg-background text-foreground antialiased"
        suppressHydrationWarning
      >
        {/* The preloader is server-rendered so it covers the page from the
            first paint rather than flashing in after hydration — which means
            without scripting it would cover the page permanently. */}
        <noscript>
          <style>{`#preloader{display:none!important}`}</style>
        </noscript>
        {/* One copy of the goo filter for the whole site: an id has to be
            unique for `url(#…)` to resolve, and both the preloader and the
            about page point at it. */}
        <LiquidDefs />
        <Preloader />
        <NextIntlClientProvider>
          {/* Five links stand between the top of the tab order and the page
              on every route, and on a page of products there are dozens more
              before the end of it. Off screen until it takes focus. */}
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-6 focus:top-6 focus:z-[200] focus:rounded-full focus:bg-foreground focus:px-5 focus:py-3 focus:text-xs focus:font-medium focus:tracking-wide focus:text-background"
          >
            {t("skipToContent")}
          </a>
          <Navbar />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
