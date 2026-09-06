import { NextResponse } from "next/server";

// Start of the GitHub OAuth flow for the CMS at /admin. This is a port of
// Sveltia's Cloudflare Worker (sveltia-cms-auth) onto Vercel, so the site does
// not need a second hosting account just to sign in.
//
// The CMS opens this in a popup, we bounce to GitHub, and /api/auth/callback
// posts the token back to the popup's opener.

const CLIENT_ID = process.env.GITHUB_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_OAUTH_CLIENT_SECRET;

/**
 * Hosts allowed to start a sign-in, comma separated, e.g.
 * "maangok.com,localhost:3000". Without it any site could point its CMS
 * at this endpoint and use the OAuth app.
 */
const ALLOWED_HOSTS = (process.env.GITHUB_OAUTH_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

export async function GET(request: Request) {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("[auth] GITHUB_OAUTH_CLIENT_ID or _SECRET is not set");
    return new NextResponse("OAuth is not configured on this deployment.", { status: 503 });
  }

  const url = new URL(request.url);
  const provider = url.searchParams.get("provider");

  if (provider !== "github") {
    return new NextResponse("Only the github provider is supported.", { status: 400 });
  }

  // `site_id` is the host the CMS is being served from. Fall back to the
  // request's own host so a same-origin admin page works without it.
  const siteId = url.searchParams.get("site_id") ?? url.host;

  if (ALLOWED_HOSTS.length && !ALLOWED_HOSTS.includes(siteId)) {
    console.error(`[auth] rejected site_id ${siteId}; allowed: ${ALLOWED_HOSTS.join(", ")}`);
    // Name the host that was turned away and the ones that would have been
    // let through. The bare refusal this used to return was a dead end:
    // the whole check hinges on one environment variable, and the person
    // hitting it is the one who can fix it. Both sides are hostnames of a
    // site they already own, so there is nothing here worth withholding.
    // `siteId` is attacker-controlled, hence the filter and the explicit
    // plain-text content type.
    const shown = siteId.replace(/[^a-zA-Z0-9.:_-]/g, "").slice(0, 80);
    return new NextResponse(
      [
        "This site is not allowed to authenticate here.",
        "",
        `Asked for: ${shown}`,
        `Allowed:   ${ALLOWED_HOSTS.join(", ")}`,
        "",
        "Set GITHUB_OAUTH_ALLOWED_HOSTS on the deployment to include the host",
        "above, then redeploy — Vercel only picks up environment variables on a",
        "new deployment.",
      ].join("\n"),
      { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  }

  const csrfToken = crypto.randomUUID().replaceAll("-", "");
  const authorize = new URL("https://github.com/login/oauth/authorize");

  authorize.searchParams.set("client_id", CLIENT_ID);
  authorize.searchParams.set("scope", url.searchParams.get("scope") ?? "repo,user");
  authorize.searchParams.set("state", csrfToken);

  const response = NextResponse.redirect(authorize, 302);

  // Read back in the callback to confirm the round trip is the one we started.
  response.cookies.set("csrf-token", `${provider}_${csrfToken}`, {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return response;
}
