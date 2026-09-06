import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { brand, brandFull } from "@/lib/brand";

/**
 * The card that appears when a page of this site is pasted into a message.
 *
 * Without one, every share of the site — the whole point of a link someone
 * sends a friend about a sofa — arrived as a bare line of text. Drawn rather
 * than photographed: it applies to every page under this layout, and a single
 * photograph would be wrong on most of them, where the wordmark on the site's
 * own paper is right on all.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = brandFull;

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fcfaf7",
          color: "#2a2724",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 116, fontWeight: 700, letterSpacing: "-0.03em" }}>
            {brand.wordmark}
          </div>
          <div style={{ fontSize: 40, letterSpacing: "0.42em", color: "#6b635c" }}>{brand.zh}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ height: 1, width: "100%", background: "#ddd6cd" }} />
          <div style={{ fontSize: 27, lineHeight: 1.45, color: "#57504a", maxWidth: 900 }}>
            {t("ogDescription")}
          </div>
        </div>
      </div>
    ),
    size
  );
}
