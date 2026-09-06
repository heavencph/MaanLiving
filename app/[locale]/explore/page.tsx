import type { Metadata } from "next";
import { alternates } from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CrystalCard } from "@/components/explore/crystal-card";
import { FloatingTitle } from "@/components/explore/floating-title";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.explore" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: alternates("/explore", locale),
  };
}

// both pieces render from real geometry; the cut-outs stay as the fallback
const ITEM_IMAGES = ["/images/home/stickers/stool.png", "/images/home/stickers/frankie.png"];
const ITEM_MODELS: (string | undefined)[] = ["/models/stool.glb", "/models/frankie.glb"];

export default async function ExplorePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "explore" });
  const items = t.raw("items") as {
    code: string;
    name: string;
    category: string;
    cta: string;
  }[];

  return (
    <div>
      {/* the pieces do the talking, so the page opens on the title alone */}
      <FloatingTitle>{t("title")}</FloatingTitle>

      {items.map((item, i) => (
        <CrystalCard
          key={item.code}
          code={item.code}
          name={item.name}
          image={ITEM_IMAGES[i]}
          model={ITEM_MODELS[i]}
        />
      ))}
    </div>
  );
}
