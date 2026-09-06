import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * What a wrong address gets.
 *
 * There was no page for this, so it got Next's own — an unstyled line of text
 * on a white field, with no way back into the site and nothing to say whose
 * site it was. A visitor who mistypes an address or follows a link that has
 * moved is the one visitor most in need of a way onward.
 */
export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <div className="container-fluid flex min-h-[70vh] flex-col justify-center py-32">
      <div className="max-w-xl">
        <p className="mb-5 font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          404
        </p>
        <h1 className="font-heading text-4xl font-light leading-[1.2] text-foreground md:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-6 text-base leading-relaxed text-muted-foreground">{t("body")}</p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/products"
            className="rounded-full bg-foreground px-6 py-3 text-xs font-medium tracking-wide text-background transition-opacity hover:opacity-90"
          >
            {t("toProducts")}
          </Link>
          <Link
            href="/"
            className="rounded-full border border-foreground/20 px-6 py-3 text-xs font-medium tracking-wide text-foreground transition-colors hover:border-foreground/60"
          >
            {t("toHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
