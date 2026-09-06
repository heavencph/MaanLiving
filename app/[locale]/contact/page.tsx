import type { Metadata } from "next";
import { alternates } from "@/lib/seo";

import { getTranslations, setRequestLocale } from "next-intl/server";
import { SectionHeading } from "@/components/shared/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { ContactForm } from "@/sections/contact/contact-form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.contact" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: alternates("/contact", locale),
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "contact" });
  const faqs = t.raw("faqs") as { q: string; a: string }[];

  return (
    <div className="container-fluid grid grid-cols-1 gap-16 pb-24 pt-32 md:pb-32 md:pt-40 lg:grid-cols-2 lg:gap-24">
      <div>
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
          className="mb-12"
          entrance="none"
        as="h1"
      />
        {/* The form is the page. It should be there when the page is. */}
        <ContactForm />
      </div>

      <div>
        {/* The showroom, phone and email blocks are gone: the address and
            number were placeholder copy and there is no mailbox yet, so each
            one sent a customer somewhere nobody answers. The form is the one
            route that reaches us, and it goes to the enquiries sheet. */}
        <Reveal delay={0.15}>
          <p className="mb-4 text-xs uppercase tracking-[0.25em] text-muted-foreground">{t("faqTitle")}</p>
          <Accordion type="single" collapsible>
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-sm font-medium text-foreground">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </div>
  );
}
