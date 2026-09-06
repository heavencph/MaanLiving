import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // The CMS is a static page under `public/`, which Next serves at
  // /admin/index.html but not at /admin. This makes the tidy URL work.
  rewrites() {
    return [{ source: "/admin", destination: "/admin/index.html" }];
  },
  // The design philosophy is a part of the about page rather than a page of
  // its own now. It was live long enough to be linked to and indexed, so the
  // old address takes people to where the writing went instead of to a 404.
  // The other move — `?category=` to `/collections/:category` — is in
  // `proxy.ts`, because a redirect here would carry the old query through to
  // the new address.
  redirects() {
    return [
      { source: "/philosophy", destination: "/about", permanent: true },
      { source: "/:locale(en|zh)/philosophy", destination: "/:locale/about", permanent: true },
    ];
  },
  // No `images.remotePatterns`: every photo is served from this deployment.
  // Nothing the browser loads comes from a third-party host, which also keeps
  // the site usable where those hosts are slow or blocked.
};

export default withNextIntl(nextConfig);
