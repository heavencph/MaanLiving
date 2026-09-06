import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

/**
 * Categories used to be `?category=` on the catalogue and are pages of their
 * own now. A redirect in `next.config` would do the matching, but it carries
 * the original query through to the destination by design, so the old address
 * would land on `/collections/sofa?category=sofa` — the right page under a
 * duplicate of the address it was moved off. Done here, the query goes.
 */
function movedCollection(request: NextRequest): URL | null {
  const { pathname, searchParams } = request.nextUrl;
  const stripped = pathname.replace(
    new RegExp(`^/(${routing.locales.join("|")})(?=/|$)`),
    ""
  );
  if (stripped !== "/products") return null;
  const category = searchParams.get("category");
  if (!category) return null;

  const url = request.nextUrl.clone();
  url.pathname = `${pathname.slice(0, pathname.length - "/products".length)}/collections/${category}`;
  url.search = "";
  return url;
}

export default function proxy(request: NextRequest) {
  const moved = movedCollection(request);
  if (moved) return NextResponse.redirect(moved, 308);
  return intl(request);
}

export const config = {
  // `admin` is excluded alongside `api`: it is the CMS, not a page of the site,
  // and next-intl would otherwise read it as a locale and redirect it away.
  matcher: ["/((?!api|admin|_next|_vercel|.*\\..*).*)"],
};
