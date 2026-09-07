"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LIQUID_FILTER_ID } from "@/components/motion/liquid-text";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";
import { routing } from "@/i18n/routing";
import { brand } from "@/lib/brand";

/**
 * Which pages get a curtain.
 *
 * Two do: about and contact. They are places you go on purpose and then stay
 * a while, so a moment of held breath before them belongs to them.
 *
 * The home page is not one of them any more, and that is the point of the
 * front door: someone arriving at the site should meet the site, not a wait
 * in front of it. The catalogue never had one either — browsing runs on
 * comparison, open a chair, go back, open the next one, and a curtain across
 * every one of those steps is not an entrance but a toll, charged most often
 * to the people looking hardest at the furniture.
 */
type Variant = "plain";

const CURTAIN_ROUTES: Record<string, Variant> = {
  "/about": "plain",
  "/contact": "plain",
};

/** The variant this path is owed, or null for the pages that get none. */
function variantFor(pathname: string): Variant | null {
  const stripped = pathname.replace(
    new RegExp(`^/(${routing.locales.join("|")})(?=/|$)`),
    ""
  );
  return CURTAIN_ROUTES[stripped || "/"] ?? null;
}

/**
 * How long the wordmark takes to resolve out of the liquid, and how long the
 * curtain will wait past that for the page.
 *
 * The resolve runs on the clock alone. It used to park at 92% until the page
 * reported itself ready, which is honest but reads as a stall — and the number
 * beside it was never a real measure of anything anyway. Readiness still
 * decides when the curtain *leaves*; it just no longer holds the animation
 * hostage on the way there.
 */
const TIMING = {
  plain: { intro: 1500, route: 650, exitIntro: 700, exitRoute: 620 },
} as const;

/**
 * A ceiling on the wait. A loader that honours readiness and nothing else
 * becomes an indefinite hold on a bad connection, which is worse than showing
 * an unfinished page.
 */
const MAX_MS = 5200;
/** If a click never becomes a navigation, the curtain still has to leave. */
const ROUTE_MAX_MS = 6000;

/**
 * Where the melt starts, in em of the wordmark.
 *
 * Measured against the goo rather than guessed: at 0.15em — what the scroll
 * reveal uses on body copy — the seven letters have already run together into
 * a single bar, and by 0.04em they are only slightly fat. So the whole liquid
 * range is 0.28em down to about 0.05em, and the melt now starts at the top of
 * it instead of a third of the way down. Past roughly 0.5em the threshold has
 * nothing left to hold and the wordmark disappears altogether.
 */
const MELT_EM = 0.28;
/** The site's ease, for the curtain that lifts rather than opens. */
const LIFT_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

const WORDMARK = brand.wordmark;
// The page's own paper and ink. Written as hex because a canvas cannot
// resolve a CSS variable.
const THEME = {
  plain: {
    curtain: "#faf5e9",
    ink: "#3b2414",
    chrome: "text-muted-foreground",
    rule: "bg-charcoal/20",
  },
} as const;

type Mode = "intro" | "route";
type Run = { id: number; mode: Mode; variant: Variant };

/** Set off the viewport rather than a breakpoint, so it reads the same on any. */
function wordmarkPx(width: number) {
  return (width < 768 ? 0.13 : 0.08) * width;
}

/**
 * The wordmark resolving out of the same liquid the rest of the site uses, and
 * then the whole curtain sliding off the top of the screen: once on arrival,
 * and again over each page moved to — on the two pages that get one.
 *
 * Canvas rather than live text, because the melt is a threshold filter over
 * the drawn letters and there is no way to run one over real text that holds
 * up across browsers.
 */
export function Preloader() {
  const pathname = usePathname();
  const reduced = usePrefersReducedMotion();

  // Server and first client render agree, so nothing here leans on hydration
  // repairing a mismatch. Landing straight on a page that gets no curtain
  // starts with none, rather than one that would have to be taken back.
  const [run, setRun] = useState<Run | null>(() => {
    const variant = variantFor(pathname);
    return variant ? { id: 0, mode: "intro", variant } : null;
  });
  const [seen, setSeen] = useState(pathname);
  const [arrived, setArrived] = useState(true);
  const [count, setCount] = useState(0);
  // The curtain leaves by sliding off the top of the screen, wordmark and
  // count with it. That is a transform on the whole layer rather than anything
  // painted, so it is handed to CSS and runs off the main thread.
  const [leaving, setLeaving] = useState(false);
  const meltRef = useRef<HTMLCanvasElement>(null);
  const arrivedRef = useRef(true);
  useEffect(() => {
    arrivedRef.current = arrived;
  }, [arrived]);

  const raise = useCallback((mode: Mode, landed: boolean, variant: Variant) => {
    setRun((r) => ({ id: (r?.id ?? 0) + 1, mode, variant }));
    setArrived(landed);
    setLeaving(false);
  }, []);

  // Adjusted during render rather than from an effect: by the time an effect
  // runs the new route is already painted, and that frame is exactly what the
  // curtain exists to cover.
  if (pathname !== seen) {
    setSeen(pathname);
    setArrived(true);
    // No run in flight means this was not a link click — a back or forward,
    // say — so the curtain plays over a page that has already landed.
    const arriving = variantFor(pathname);
    if (!run && arriving) raise("route", true, arriving);
  }

  const mode = run?.mode;
  const runId = run?.id;
  const variant = run?.variant ?? "plain";
  const theme = THEME[variant];

  // Catch the click before `Link` does. In the bubble phase Next has already
  // called preventDefault to take the navigation client-side, so every
  // internal link would look cancelled and get skipped.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same page, or only a fragment of it: nothing is going to navigate, and
      // a curtain over a jump to an anchor is just in the way.
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }
      // Whether there is a curtain at all, and which one, belongs to where the
      // click is going rather than where it is leaving: `usePathname` only
      // catches up once the new route commits, which is a whole navigation
      // after the curtain has to know.
      const going = variantFor(url.pathname);
      if (going) raise("route", false, going);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [raise]);

  useEffect(() => {
    if (runId === undefined || mode === undefined) return;
    const melting = meltRef.current;
    if (!melting) return;

    const intro = mode === "intro";
    const timing = TIMING[variant];
    const span = intro ? timing.intro : timing.route;
    const ceiling = intro ? MAX_MS : ROUTE_MAX_MS;
    const exitMs = intro ? timing.exitIntro : timing.exitRoute;
    const hold = intro ? 260 : 120;
    const { ink } = THEME[variant];

    let raf = 0;
    let lift = 0;
    let ready = Boolean(reduced);
    let exitFrom: number | null = null;
    // When the melt starts, which is the first frame it can be seen on rather
    // than the moment the page was asked for. A canvas cannot paint before the
    // script that paints it runs, and on arrival that is a few hundred
    // milliseconds — the most liquid part of the resolve, spent behind a
    // curtain nobody was looking through. The wait itself is not lost: it is
    // still counted against the ceiling below.
    let meltFrom: number | null = null;
    const startedAt = performance.now();

    const settle = () => {
      ready = true;
    };
    if (intro) {
      if (document.fonts) document.fonts.ready.then(settle).catch(settle);
      else settle();
      if (document.readyState === "complete") settle();
      else window.addEventListener("load", settle, { once: true });
    }

    let fontPx = 0;
    let vw = 0;
    let dpr = 1;
    let stripH = 0;

    /**
     * The canvas is a strip just tall enough to hold the letters and the blur
     * around them, drawn on nothing — the curtain behind it is the element's
     * own background. It never changes size: a canvas that resizes is a layout
     * shift, and its box is set in CSS off the viewport width, the same measure
     * the wordmark is set in, so it is right before any script has run.
     *
     * The melt is a CSS filter on that element rather than a filter inside the
     * canvas, because a filter *inside* a canvas cannot reference an SVG one
     * everywhere: WebKit takes the whole declaration as invalid and silently
     * keeps the last valid value, which is none, and the wordmark simply
     * arrives sharp. A CSS filter on an element is the same mechanism the
     * scroll reveal already uses, on every engine.
     */
    const size = () => {
      vw = window.innerWidth;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      fontPx = wordmarkPx(vw);
      // Read back rather than computed: the strip's height is a CSS length,
      // and this is the one place the two could drift apart.
      stripH = melting.getBoundingClientRect().height || Math.ceil(fontPx * 2.6);
      melting.width = Math.ceil(vw * dpr);
      melting.height = Math.ceil(stripH * dpr);
    };
    size();
    window.addEventListener("resize", size);

    const meltCtx = melting.getContext("2d");

    const paintMelt = (melt: number) => {
      const ctx = meltCtx;
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, vw, stripH);
      ctx.font = `840 ${fontPx}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = ink;
      ctx.fillText(WORDMARK, vw / 2, stripH / 2);
      const blurPx = MELT_EM * (1 - melt) ** 2 * fontPx;
      melting.style.filter =
        blurPx > 0.3 ? `blur(${blurPx.toFixed(2)}px) url(#${LIQUID_FILTER_ID})` : "none";
    };

    const tick = () => {
      const now = performance.now();
      if (meltFrom === null) meltFrom = now;
      // Against the ceiling, time is counted from navigation on arrival — the
      // wait before hydration was part of the wait.
      const waited = intro ? now : now - startedAt;
      // The resolve is the clock's, start to finish.
      const melt = reduced ? 1 : Math.min((now - meltFrom) / span, 1);
      if (intro) setCount(Math.round(melt * 100));

      // Leaving is still the page's call, within reason: the wordmark can be
      // fully resolved and the curtain hold a moment longer for a page that
      // has not landed yet.
      const landed = intro ? ready : ready || arrivedRef.current;
      if (exitFrom === null && ((melt >= 1 && landed) || waited >= ceiling)) {
        exitFrom = now + hold;
      }

      const leave = exitFrom !== null && now >= exitFrom;
      if (reduced) {
        setRun(null);
        return;
      }

      // The curtain does not animate its exit on this loop: it slides off the
      // top as one layer, which is a transform CSS can run on its own — and
      // does run, even on a page too busy to be feeding this loop.
      if (leave) {
        paintMelt(1);
        setLeaving(true);
        lift = window.setTimeout(() => setRun(null), exitMs);
        return;
      }

      paintMelt(melt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(lift);
      window.removeEventListener("resize", size);
      window.removeEventListener("load", settle);
    };
  }, [runId, mode, variant, reduced]);

  // Nothing behind it should be reachable while it is up.
  useEffect(() => {
    if (!run) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [run]);

  if (!run) return null;

  return (
    <div
      // `aria-hidden`: it is a curtain, not content, and a screen reader
      // should be reading the page it covers rather than a count.
      aria-hidden
      id="preloader"
      className="fixed inset-0 z-[100]"
      style={{
        // The curtain is the element's own background rather than anything
        // the canvas paints, so it is there from the first render — before the
        // script that draws the wordmark on top of it has run.
        backgroundColor: theme.curtain,
        transform: leaving ? "translateY(-100%)" : "translateY(0)",
        transition: `transform ${TIMING[variant][mode === "intro" ? "exitIntro" : "exitRoute"]}ms ${LIFT_EASE}`,
      }}
    >
      {/* The strip the wordmark melts in. Its height is the wordmark's own
          measure — 2.6 times a font set at 13vw under the breakpoint and 8vw
          over it — written in CSS so it is right on the first render, before
          any script has had a chance to size it. Centred by translation, which
          is free of layout and so free of shifting it. */}
      <canvas
        ref={meltRef}
        className="absolute left-0 top-1/2 block h-[33.8vw] w-full -translate-y-1/2 md:h-[20.8vw]"
      />
      {/* The count belongs to arrival only. Between pages there is nothing
          measurable being waited on, and a number climbing to 100 would be
          claiming progress that is not being tracked. It clears before the
          openings widen, so nothing is left floating over the page. */}
      {mode === "intro" && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0"
        >
          <div className="container-fluid flex items-end justify-between pb-6 md:pb-8">
            <span
              className={`text-[0.65rem] uppercase tracking-[0.3em] ${theme.chrome}`}
            >
              {brand.latin}
            </span>
            {/* Tabular figures so the count does not jitter its own width as
                it climbs past each digit. */}
            <span
              className={`font-sans text-[0.65rem] tabular-nums tracking-[0.3em] ${theme.chrome}`}
            >
              {String(count).padStart(3, "0")}
            </span>
          </div>
          <div
            className={`h-px origin-left ${theme.rule}`}
            style={{ transform: `scaleX(${count / 100})` }}
          />
        </div>
      )}
    </div>
  );
}
