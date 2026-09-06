/**
 * Absolute origin of the deployed site, for anywhere a full URL is needed —
 * Open Graph tags, the sitemap, robots.txt.
 *
 * `VERCEL_PROJECT_PRODUCTION_URL` is set by Vercel itself and holds the
 * production host, so this stays correct with nothing to configure.
 * `NEXT_PUBLIC_SITE_URL` overrides it for a custom domain.
 */
export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}
