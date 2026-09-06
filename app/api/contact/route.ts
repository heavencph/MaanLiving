import { routing } from "@/i18n/routing";

// Enquiries and newsletter signups are forwarded to a Google Apps Script web
// app, which appends them to a spreadsheet. Both env vars are set in Vercel;
// see docs/enquiries.md for the sheet-side setup.
const WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET;

const SUBMISSION_TYPES = ["contact", "newsletter"] as const;
type SubmissionType = (typeof SUBMISSION_TYPES)[number];

const LIMITS = {
  name: 100,
  phone: 40,
  email: 200,
  topic: 100,
  message: 5000,
} as const;

/** Deliberately loose — the aim is to catch typos, not to police valid addresses. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  if (!WEBHOOK_URL || !WEBHOOK_SECRET) {
    // Never let a misconfigured deploy show the visitor a success screen over a
    // submission that went nowhere — that is the bug this route exists to fix.
    console.error("[contact] GOOGLE_SHEETS_WEBHOOK_URL or _SECRET is not set");
    return Response.json({ error: "unavailable" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }

  // Bots fill every field they find; humans never see this one.
  if (clean(body.company, 200)) {
    return Response.json({ ok: true });
  }

  const type: SubmissionType = SUBMISSION_TYPES.includes(body.type as SubmissionType)
    ? (body.type as SubmissionType)
    : "contact";

  const email = clean(body.email, LIMITS.email);
  if (!EMAIL.test(email)) {
    return Response.json({ error: "email" }, { status: 400 });
  }

  const name = clean(body.name, LIMITS.name);
  const message = clean(body.message, LIMITS.message);
  if (type === "contact" && (!name || !message)) {
    return Response.json({ error: "required" }, { status: 400 });
  }

  const locale = routing.locales.includes(body.locale as (typeof routing.locales)[number])
    ? (body.locale as string)
    : routing.defaultLocale;

  const submission = {
    secret: WEBHOOK_SECRET,
    type,
    submittedAt: new Date().toISOString(),
    locale,
    name,
    phone: clean(body.phone, LIMITS.phone),
    email,
    topic: clean(body.topic, LIMITS.topic),
    message,
  };

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
      signal: AbortSignal.timeout(10_000),
    });

    // An Apps Script web app answers 200 to almost everything — a wrong access
    // setting returns a Google sign-in page, not an error. So the body has to
    // confirm the row landed; `res.ok` alone would report a silent loss as
    // success. The payload is logged on failure so the enquiry can still be
    // recovered from the Vercel runtime logs.
    const echoed = await res.text();
    if (!res.ok || !echoed.includes('"ok"')) {
      console.error(`[contact] sheet responded ${res.status}: ${echoed.slice(0, 300)}`, submission);
      return Response.json({ error: "upstream" }, { status: 502 });
    }
  } catch (error) {
    console.error("[contact] could not reach the sheet", error, submission);
    return Response.json({ error: "upstream" }, { status: 502 });
  }

  return Response.json({ ok: true });
}
