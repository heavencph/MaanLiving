"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";

export function ContactForm() {
  const t = useTranslations("contact.form");
  const locale = useLocale();
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setStatus("sending");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "contact",
          locale,
          name: data.get("name"),
          phone: data.get("phone"),
          email: data.get("email"),
          topic: data.get("topic"),
          message: data.get("message"),
          company: data.get("company"),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      // only now — the thank-you screen must mean the enquiry actually landed
      setSubmitted(true);
    } catch {
      setStatus("error");
    }
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-border bg-beige/40 p-10 text-center"
      >
        <p className="font-heading text-xl text-foreground">{t("thanksTitle")}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t("thanksBody")}</p>
      </motion.div>
    );
  }

  const topicOptions = t.raw("topicOptions") as string[];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* honeypot — hidden from people, irresistible to bots */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute h-0 w-0 overflow-hidden opacity-0"
      />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-2 block text-xs uppercase tracking-[0.15em] text-muted-foreground">
            {t("name")}
          </label>
          <input
            id="name"
            name="name"
            required
            className="w-full border-b border-border bg-transparent py-2.5 text-sm text-foreground focus:border-foreground focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="phone" className="mb-2 block text-xs uppercase tracking-[0.15em] text-muted-foreground">
            {t("phone")}
          </label>
          <input
            id="phone"
          name="phone"
            type="tel"
            className="w-full border-b border-border bg-transparent py-2.5 text-sm text-foreground focus:border-foreground focus:outline-none"
          />
        </div>
      </div>
      <div>
        <label htmlFor="email" className="mb-2 block text-xs uppercase tracking-[0.15em] text-muted-foreground">
          {t("email")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full border-b border-border bg-transparent py-2.5 text-sm text-foreground focus:border-foreground focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="topic" className="mb-2 block text-xs uppercase tracking-[0.15em] text-muted-foreground">
          {t("topic")}
        </label>
        <select
          id="topic"
          name="topic"
          className="w-full border-b border-border bg-transparent py-2.5 text-sm text-foreground focus:border-foreground focus:outline-none"
          defaultValue={topicOptions[0]}
        >
          {topicOptions.map((opt) => (
            <option key={opt}>{opt}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="message" className="mb-2 block text-xs uppercase tracking-[0.15em] text-muted-foreground">
          {t("message")}
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          className="w-full resize-none border-b border-border bg-transparent py-2.5 text-sm text-foreground focus:border-foreground focus:outline-none"
        />
      </div>
      {status === "error" && (
        <p role="alert" className="text-sm leading-relaxed text-terracotta">
          {t("error")}
        </p>
      )}
      <motion.button
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-full bg-foreground py-4 text-sm font-medium tracking-wide text-background transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto sm:px-10"
      >
        {status === "sending" ? t("sending") : t("submit")}
      </motion.button>
    </form>
  );
}
