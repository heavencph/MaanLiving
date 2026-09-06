import { NextResponse } from "next/server";

// Second leg of the CMS sign-in started in ../route.ts: swap the code GitHub
// handed back for an access token, then hand that to the popup's opener using
// the message format Sveltia/Decap listen for.

const CLIENT_ID = process.env.GITHUB_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_OAUTH_CLIENT_SECRET;

/**
 * Renders the page that hands the result to the window that opened us.
 *
 * The handshake is the popup's to start, and this is the half that was wrong
 * first time round: we only listened for `authorizing:github` and never sent
 * it, so the CMS sat waiting for a greeting that never came and the popup
 * spun forever. Mirrors the order Sveltia's own client uses —
 *
 *   1. popup  → opener   `authorizing:github`
 *   2. opener → popup    the same string echoed back
 *   3. popup  → opener   `authorization:github:<state>:<json>`
 *
 * Step 1 is sent to `*`, matching sveltia-cms-auth's own worker: at that
 * point the popup does not yet know the opener's origin, only that it is
 * whichever tab it was opened from — which need not be the popup's own
 * origin. A site now reachable at more than one host (an apex domain, its
 * `www`, and the old `<project>.vercel.app`) makes that a real case, not a
 * hypothetical one: `/admin` opened from one host still starts the OAuth
 * flow at whatever host `base_url` in config.yml names, and step 1 landing
 * with a specific `targetOrigin` — this used `window.location.origin`, the
 * popup's own origin, until traced back to here — is silently dropped
 * whenever those two hosts differ. Nothing sent in step 1 is sensitive, so
 * there is nothing a wildcard target costs here. Step 3 still goes only to
 * the origin the echo in step 2 arrived from, so the token is never
 * broadcast to a window we have not heard from.
 */
function postMessagePage(state: "success" | "error", content: unknown) {
  const message = `authorization:github:${state}:${JSON.stringify(content)}`;

  return new NextResponse(
    `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>登入中…</title></head><body>
<script>
(function () {
  var message = ${JSON.stringify(message)};

  function onEcho(event) {
    if (event.data !== 'authorizing:github') return;
    window.removeEventListener('message', onEcho);
    if (window.opener) window.opener.postMessage(message, event.origin);
  }

  window.addEventListener('message', onEcho);
  // '*': see the block comment above postMessagePage for why this cannot be
  // window.location.origin.
  if (window.opener) window.opener.postMessage('authorizing:github', '*');
})();
</script>
<p>登入處理中，這個視窗會自動關閉。</p>
</body></html>`,
    { status: state === "success" ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  // Error payloads carry the shape the CMS reads back: provider, error, errorCode.
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("[auth/callback] GITHUB_OAUTH_CLIENT_ID or _SECRET is not set");
    return postMessagePage("error", {
      provider: "github",
      error: "OAuth is not configured on this deployment.",
      errorCode: "NOT_CONFIGURED",
    });
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookie = request.headers.get("cookie") ?? "";
  const expected = /csrf-token=([a-z-]+?)_([0-9a-f]{32})/.exec(cookie);

  if (!code || !state || !expected || state !== expected[2]) {
    console.error("[auth/callback] CSRF state did not match");
    return postMessagePage("error", {
      provider: "github",
      error: "Invalid state.",
      errorCode: "INVALID_STATE",
    });
  }

  let token: string | undefined;
  let errorText: string | undefined;

  try {
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json()) as { access_token?: string; error_description?: string };
    token = data.access_token;
    errorText = data.error_description;
  } catch (error) {
    console.error("[auth/callback] token exchange failed", error);
    errorText = "Could not reach GitHub.";
  }

  if (!token) {
    return postMessagePage("error", {
      provider: "github",
      error: errorText ?? "No access token returned.",
      errorCode: "NO_TOKEN",
    });
  }

  const response = postMessagePage("success", { provider: "github", token });
  response.cookies.delete("csrf-token");
  return response;
}
