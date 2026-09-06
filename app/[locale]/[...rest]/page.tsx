import { notFound } from "next/navigation";

/**
 * Anything that matches no route at all.
 *
 * Without this, an address like /no-such-page falls past the locale segment
 * to Next's own not-found — an unstyled line of text with no way back into the
 * site. Catching it here keeps it inside the locale, so it gets the site's
 * layout, its language, and its own 404 page.
 */
export default function CatchAll() {
  notFound();
}
