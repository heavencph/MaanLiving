"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** A two-way 中文 / EN toggle that swaps locale while staying on the same page. */
export function LanguageSwitcher({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const t = useTranslations("languageSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchTo(next: "zh" | "en") {
    if (next === locale) return;
    router.replace(pathname, { locale: next, scroll: false });
  }

  return (
    <div
      role="group"
      aria-label={t("label")}
      className={cn(
        "flex items-center gap-1 rounded-full border p-0.5 text-[0.7rem] font-medium tracking-wide",
        variant === "desktop" ? "border-current/30" : "border-border"
      )}
    >
      {(["zh", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          aria-pressed={locale === l}
          className={cn(
            "rounded-full px-2.5 py-1 transition-colors",
            locale === l
              ? variant === "desktop"
                ? "bg-current/15"
                : "bg-foreground text-background"
              : "opacity-60 hover:opacity-100"
          )}
        >
          {l === "zh" ? "中文" : "EN"}
        </button>
      ))}
    </div>
  );
}
