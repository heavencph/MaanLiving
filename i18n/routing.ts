import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["zh", "en"],
  defaultLocale: "zh",
  localePrefix: "as-needed",
  // The bare address is always the Chinese site. Left on, next-intl reads the
  // browser's `accept-language` and sends anyone whose browser is set to
  // English to /en instead — so most visitors abroad, and anyone on a phone
  // bought overseas, would never see the Chinese site at all unless they
  // noticed the switch. This is a Taiwanese brand: Chinese is the front door,
  // and English is a door you choose.
  //
  // Off, this covers the stored preference as well as the header, so a visitor
  // who once chose English still lands on Chinese when they type the domain
  // again. That is the intent, not a side effect — and it is why the cookie
  // goes too: it exists only to be read by the detection that is now off, so
  // leaving it on would set a cookie in every visitor's browser that nothing
  // ever looks at. Choosing a language still works; it is a link to /en.
  localeDetection: false,
  localeCookie: false,
});

export type AppLocale = (typeof routing.locales)[number];
