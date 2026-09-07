"use client";

import { useState, type FormEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Reveal } from "@/components/motion/reveal";

/**
 * Hidden, not deleted. Nothing renders this at present — it came off the home
 * and about pages, and off the philosophy page before that page was folded
 * into about. Putting it back is an import and a
 * `<Newsletter />` on whichever page should carry it; the copy, the styling and
 * the `type: "newsletter"` path through /api/contact are all still here and
 * still work.
 */
export function Newsletter() {
  const t = useTranslations("newsletter");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("sending");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "newsletter", locale, email }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSubmitted(true);
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="band-dark py-16 text-warmwhite md:py-32">
      <div className="container-fluid">
        <Reveal className="mx-auto max-w-xl text-center">
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-warmwhite/60">{t("eyebrow")}</p>
          <h2 className="mb-4 font-heading text-3xl font-light leading-snug md:text-4xl">
            {t("title")}
          </h2>
          <p className="mb-10 text-sm leading-relaxed text-warmwhite/70">
            {t("description")}
          </p>
          {submitted ? (
            <p className="text-sm text-warmwhite/90">{t("thanks")}</p>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  required
                  placeholder={t("placeholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full flex-1 border-b border-warmwhite/30 bg-transparent px-1 py-3 text-sm text-warmwhite placeholder:text-warmwhite/40 focus:border-warmwhite focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="whitespace-nowrap rounded-full border border-warmwhite/60 px-6 py-3 text-xs font-medium tracking-wide text-warmwhite transition-colors hover:bg-warmwhite hover:text-charcoal disabled:opacity-50"
                >
                  {status === "sending" ? t("sending") : t("button")}
                </button>
              </form>
              {status === "error" && (
                <p role="alert" className="mt-4 text-sm text-warmwhite/80">
                  {t("error")}
                </p>
              )}
            </>
          )}
        </Reveal>
      </div>
    </section>
  );
}
