"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LIQUID_FILTER_ID } from "@/components/motion/liquid-text";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";
import { routing } from "@/i18n/routing";
import { brand } from "@/lib/brand";

/**
 * Which pages get a curtain, and which kind.
 *
 * Only four do. They are the places you go on purpose — the home page,
 * explore, about and contact — and each is somewhere you arrive and then stay
 * a while, so a moment of held breath before it belongs to them.
 *
 * The catalogue is the opposite kind of place. Browsing runs on comparison:
 * open a sofa, go back, open the next one, back again. A curtain across every
 * one of those steps is not an entrance, it is a toll, and it is charged
 * most often to the people looking hardest at the furniture. So products, the
 * product pages, and everything else outside the four go straight through.
 *
 * Of the four, the two that read as an arrival — home and explore — get the
 * dark curtain, which leaves by flying through the wordmark into the page.
 * About and contact get the light one, which resolves and then simply lifts.
 */
type Variant = "portal" | "plain";

const CURTAIN_ROUTES: Record<string, Variant> = {
  "/": "portal",
  "/explore": "portal",
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
  portal: { intro: 3000, route: 3000, exitIntro: 1200, exitRoute: 1100 },
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
/** Fraction of the exit spent turning the letters from ink into openings. */
const OPEN_AT = 0.32;
/** The site's ease, for the curtain that lifts rather than opens. */
const LIFT_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

const WORDMARK = brand.wordmark;
// Two ends of the page's own palette. The dark curtain is the near-black the
// site uses for its dark bands; the light one is the warm white it usually
// reads on. Written as hex because canvas cannot resolve a CSS variable.
const THEME = {
  portal: {
    curtain: "#150c06",
    ink: "#faf5e9",
    chrome: "text-warmwhite/55",
    rule: "bg-warmwhite/25",
  },
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

/** Where to zoom from, and how far, for the viewport to end up inside a stroke. */
type Portal = { ox: number; oy: number; scale: number };

/**
 * The search below walks the drawn wordmark pixel by pixel and then paints it
 * again to check its answer — work worth doing once rather than on every
 * navigation, which is exactly when the main thread has least to spare. Only
 * the viewport can change the answer, so that is the key.
 */
let portalCache: { key: string; portal: Portal | null } | null = null;

function getPortal(width: number, height: number): Portal | null {
  const key = `${width}x${height}`;
  if (portalCache?.key !== key) portalCache = { key, portal: measurePortal(width, height) };
  return portalCache.portal;
}

/** Size the wordmark is measured at, whatever size it is finally drawn. */
const MEASURE_PX = 60;
/** Blank margin around the probe so no stroke touches its edge. */
const PAD = 8;
/** Ink threshold, above the anti-aliased fringe of a stroke. */
const INK_ALPHA = 200;
/** Headroom on the scale, so the frame before the last is clear too. */
const SAFETY = 1.15;

/**
 * A chamfer distance transform: for every inked pixel, how far it is from the
 * nearest pixel that is not inked. Weights 5-7-11 over a 5×5 neighbourhood
 * approximate true Euclidean distance to about 2%, which is closer than the
 * verification below needs.
 *
 * Distances come back in fifths of a pixel, the unit the weights are in.
 */
function distanceToEdge(alpha: Uint8ClampedArray, w: number, h: number): Float32Array {
  const d = new Float32Array(w * h);
  const BIG = 1e9;
  for (let i = 0; i < w * h; i++) d[i] = alpha[i * 4 + 3] > INK_ALPHA ? BIG : 0;

  const A = 5, B = 7, C = 11;
  const pull = (i: number, j: number, cost: number) => {
    const v = d[j] + cost;
    if (v < d[i]) d[i] = v;
  };
  // Forward, then backward: two passes are all a chamfer transform needs.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (d[i] === 0) continue;
      if (x > 0) pull(i, i - 1, A);
      if (y > 0) {
        pull(i, i - w, A);
        if (x > 0) pull(i, i - w - 1, B);
        if (x < w - 1) pull(i, i - w + 1, B);
        if (y > 1 && x > 0) pull(i, i - 2 * w - 1, C);
        if (y > 1 && x < w - 1) pull(i, i - 2 * w + 1, C);
        if (x > 1) pull(i, i - w - 2, C);
        if (x < w - 2) pull(i, i - w + 2, C);
      }
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (d[i] === 0) continue;
      if (x < w - 1) pull(i, i + 1, A);
      if (y < h - 1) {
        pull(i, i + w, A);
        if (x < w - 1) pull(i, i + w + 1, B);
        if (x > 0) pull(i, i + w - 1, B);
        if (y < h - 2 && x < w - 1) pull(i, i + 2 * w + 1, C);
        if (y < h - 2 && x > 0) pull(i, i + 2 * w - 1, C);
        if (x < w - 2) pull(i, i + w + 2, C);
        if (x > 1) pull(i, i + w - 2, C);
      }
    }
  }
  return d;
}

/**
 * Find the point to fly through, and how far to fly.
 *
 * Scaling about a point keeps that point fixed and grows the shape around it,
 * so every pixel of the screen is eventually covered by whatever the origin
 * sits inside — provided the origin really is inside. The deeper inside, the
 * sooner: an origin at the centre of the thickest stroke needs the least
 * scale, and the letters open into the page instead of sliding past it.
 *
 * So: draw the wordmark, take the point furthest from any edge of the ink.
 * The obvious cheap version of that — walking outward along eight compass
 * directions — was tried and is wrong in exactly the way that matters here.
 * Inside a diagonal stroke every one of those rays runs along the stroke
 * rather than across it, so a 2px-thick diagonal measures 10px thick, and
 * MAAN is mostly diagonals. That left the curtain with a wedge of itself
 * still standing when the loader was cut. A distance transform measures the
 * thin axis regardless of its angle.
 *
 * The scale that follows is still only as good as the measurement, so it is
 * checked against a real paint before being trusted.
 */
function measurePortal(width: number, height: number): Portal | null {
  const fontPx = wordmarkPx(width);
  // Measured small and scaled up: the search is quadratic in the drawn size,
  // and shape is shape at any size. On a wide screen this is the difference
  // between a third of a frame and a tenth of one.
  const k = fontPx / MEASURE_PX;
  const font = (px: number) => `840 ${px}px Inter, sans-serif`;

  const probe = document.createElement("canvas");
  const ctx = probe.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.font = font(MEASURE_PX);
  const w = Math.ceil(ctx.measureText(WORDMARK).width) + PAD * 2;
  const h = Math.ceil(MEASURE_PX * 1.6);
  probe.width = w;
  probe.height = h;
  // Sizing a canvas resets its context.
  ctx.font = font(MEASURE_PX);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#000";
  ctx.fillText(WORDMARK, w / 2, h / 2);

  const dist = distanceToEdge(ctx.getImageData(0, 0, w, h).data, w, h);
  let bi = -1;
  let bv = 0;
  for (let i = 0; i < dist.length; i++) {
    if (dist[i] > bv && dist[i] < 1e9) {
      bv = dist[i];
      bi = i;
    }
  }
  if (bi < 0) return null;
  const r = (bv / 5) * k;
  if (r < 1) return null;

  // The probe is a strip around the wordmark; its centre is the screen's.
  const ox = width / 2 + ((bi % w) - w / 2) * k;
  const oy = height / 2 + (Math.floor(bi / w) - h / 2) * k;
  const far = Math.max(
    Math.hypot(ox, oy),
    Math.hypot(width - ox, oy),
    Math.hypot(ox, height - oy),
    Math.hypot(width - ox, height - oy)
  );

  // Half-size is fine to check on: the curtain fails in wedges, not in
  // stray pixels, and halving the stage quarters the read.
  const F = 0.5;
  const stage = document.createElement("canvas");
  stage.width = Math.ceil(width * F);
  stage.height = Math.ceil(height * F);
  const sctx = stage.getContext("2d", { willReadFrequently: true });
  const clears = (scale: number) => {
    if (!sctx) return true;
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.globalCompositeOperation = "source-over";
    sctx.fillStyle = "#000";
    sctx.fillRect(0, 0, stage.width, stage.height);
    sctx.setTransform(F, 0, 0, F, 0, 0);
    sctx.translate(ox, oy);
    sctx.scale(scale, scale);
    sctx.translate(-ox, -oy);
    sctx.font = font(fontPx);
    sctx.textAlign = "center";
    sctx.textBaseline = "middle";
    sctx.globalCompositeOperation = "destination-out";
    sctx.fillText(WORDMARK, width / 2, height / 2);
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.globalCompositeOperation = "source-over";
    const px = sctx.getImageData(0, 0, stage.width, stage.height).data;
    for (let i = 3; i < px.length; i += 4) if (px[i] > 8) return false;
    return true;
  };

  let scale = far / r;
  for (let i = 0; i < 12 && !clears(scale); i++) scale *= 1.2;
  return { ox, oy, scale: scale * SAFETY };
}

/**
 * the wordmark resolving out of the same liquid the rest of the site uses, then
 * opening into the page: once on arrival, and again over each page moved to.
 *
 * The wordmark is knocked out of the curtain rather than painted on it, so the
 * letters are openings onto the page behind. The curtain itself never fades —
 * the strokes widen as the wordmark rushes forward until one of them is larger
 * than the screen, and the page is simply what is on the other side. Canvas
 * because it is the one way to cut a hole in a shape of live text that holds
 * up across browsers; CSS masks that reference SVG text are patchy, and a
 * data-URI mask cannot reach the page's webfont.
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
  const [chromeFade, setChromeFade] = useState(1);
  // The light curtain leaves by sliding off the top of the screen, wordmark
  // and count with it. That is a transform on the whole layer rather than
  // anything painted, so it is handed to CSS and runs off the main thread.
  const [leaving, setLeaving] = useState(false);
  // A canvas cannot paint before the script that paints it runs, which on
  // arrival is a few hundred milliseconds of page showing through the thing
  // meant to be covering it. The element carries the curtain colour itself
  // until the canvas has a frame, and hands it over from there.
  const [painted, setPainted] = useState(false);

  const meltRef = useRef<HTMLCanvasElement>(null);
  const flightRef = useRef<HTMLCanvasElement>(null);
  const arrivedRef = useRef(true);
  useEffect(() => {
    arrivedRef.current = arrived;
  }, [arrived]);

  const raise = useCallback((mode: Mode, landed: boolean, variant: Variant) => {
    setRun((r) => ({ id: (r?.id ?? 0) + 1, mode, variant }));
    setArrived(landed);
    setChromeFade(1);
    setLeaving(false);
    setPainted(false);
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
    const flying = flightRef.current;
    if (!melting) return;

    const intro = mode === "intro";
    const flight = variant === "portal";
    const timing = TIMING[variant];
    const span = intro ? timing.intro : timing.route;
    const ceiling = intro ? MAX_MS : ROUTE_MAX_MS;
    const exitMs = intro ? timing.exitIntro : timing.exitRoute;
    const hold = intro ? 260 : 120;
    const { curtain, ink } = THEME[variant];

    let raf = 0;
    let lift = 0;
    let handedOver = false;
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

    let portal: Portal | null = null;
    let fontPx = 0;
    let vw = 0;
    let vh = 0;
    let dpr = 1;
    let stage: "melt" | "flight" = "melt";
    let stripH = 0;

    /**
     * Two canvases, because the loader draws two different things and neither
     * may resize.
     *
     * While the wordmark melts it is a strip just tall enough to hold the
     * letters and the blur around them, drawn on nothing — the curtain behind
     * it is the element's own background. The melt is a CSS filter on that
     * element rather than a filter inside the canvas, because a filter *inside*
     * a canvas cannot reference an SVG one everywhere: WebKit takes the whole
     * declaration as invalid and silently keeps the last valid value, which is
     * none, and the wordmark simply arrives sharp. A CSS filter on an element
     * is the same mechanism the scroll reveal already uses, on every engine.
     *
     * The flight needs the whole screen, because the openings have to be cut
     * out of the curtain and one surface has to do both. That used to be the
     * same canvas, resized — and a canvas changing size is a layout shift, four
     * tenths of one on the way into the flight, which is most of a page's
     * budget spent on a loader. Two elements, each the size it will always be,
     * shift nothing. Their boxes are set in CSS off the viewport width, the
     * same measure the wordmark is set in, so they are right before any script
     * has run.
     */
    const size = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      fontPx = wordmarkPx(vw);
      // Read back rather than computed: the strip's height is a CSS length,
      // and this is the one place the two could drift apart.
      stripH = melting.getBoundingClientRect().height || Math.ceil(fontPx * 2.6);
      melting.width = Math.ceil(vw * dpr);
      melting.height = Math.ceil(stripH * dpr);
      if (flying) {
        flying.width = Math.ceil(vw * dpr);
        flying.height = Math.ceil(vh * dpr);
      }
      // Only the flight needs somewhere to fly through, and finding it costs a
      // pixel search. The pages that lift instead should not pay for it.
      portal = flight ? getPortal(vw, vh) : null;
    };
    size();
    window.addEventListener("resize", size);

    const meltCtx = melting.getContext("2d");
    const flightCtx = flying?.getContext("2d") ?? null;

    const letter = (
      ctx: CanvasRenderingContext2D,
      h: number,
      fill: string,
      mode: GlobalCompositeOperation,
      alpha: number,
      scale: number,
      origin?: Portal
    ) => {
      const ox = origin ? origin.ox : vw / 2;
      const oy = origin ? origin.oy : h / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.translate(ox, oy);
      ctx.scale(scale, scale);
      ctx.translate(-ox, -oy);
      ctx.font = `840 ${fontPx}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalCompositeOperation = mode;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = fill;
      ctx.fillText(WORDMARK, vw / 2, h / 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    };

    const paintMelt = (melt: number) => {
      const ctx = meltCtx;
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, vw, stripH);
      letter(ctx, stripH, ink, "source-over", 1, 1);
      const blurPx = MELT_EM * (1 - melt) ** 2 * fontPx;
      melting.style.filter =
        blurPx > 0.3 ? `blur(${blurPx.toFixed(2)}px) url(#${LIQUID_FILTER_ID})` : "none";
    };

    const paintFlight = (exit: number) => {
      const ctx = flightCtx;
      if (!ctx || !portal) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = curtain;
      ctx.fillRect(0, 0, vw, vh);
      // Exponential rather than linear: a constant multiplier per unit time is
      // what continuous forward motion looks like, where a linear ramp across
      // this range crawls at the start and tears past at the end.
      const scale = Math.pow(portal.scale, exit);
      // The letters cross from ink to opening early in the flight, so most of
      // it is spent looking through them.
      const open = Math.min(1, exit / OPEN_AT);
      if (open > 0) letter(ctx, vh, "#000", "destination-out", open, scale, portal);
      if (open < 1) letter(ctx, vh, ink, "source-over", 1 - open, scale, portal);
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

      // A curtain that lifts does not animate on this loop: it slides off the
      // top as one layer, which is a transform CSS can run on its own — and
      // does run, even on a page too busy to be feeding this loop. A flight
      // with nowhere measured to fly through lifts as well, rather than
      // parking itself over the page.
      if (leave && !portal) {
        paintMelt(1);
        setLeaving(true);
        lift = window.setTimeout(() => setRun(null), exitMs);
        return;
      }

      if (!leave) {
        paintMelt(melt);
        raf = requestAnimationFrame(tick);
        return;
      }

      // From here the flight's canvas has it, painting the curtain rather than
      // sitting on it. The strip is wiped rather than hidden: it is underneath,
      // and its wordmark would otherwise show through the openings being cut
      // above it.
      if (stage === "melt") {
        stage = "flight";
        melting.style.filter = "none";
        meltCtx?.clearRect(0, 0, vw, stripH);
      }
      const exit = Math.min((now - (exitFrom as number)) / exitMs, 1);
      // The chrome clears before the openings widen over it.
      setChromeFade(Math.max(0, 1 - exit / OPEN_AT));
      // Finish the last frame rather than cutting one short of it: a frame
      // short of full scale is a sliver of curtain left standing.
      paintFlight(exit);
      // Only now is the canvas the one holding the curtain up, so only now can
      // the element behind it let go of it.
      if (!handedOver) {
        handedOver = true;
        setPainted(true);
      }
      if (exit >= 1) {
        setRun(null);
        return;
      }
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
        // The curtain is the element's own background until — and only until —
        // the wordmark starts flying, at which point the canvas takes over
        // painting it so the letters can be cut out of it.
        backgroundColor: painted ? undefined : theme.curtain,
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
      {/* The screen the wordmark flies through. Present from the start at the
          size it will always be, and empty until the flight begins. */}
      {variant === "portal" && (
        <canvas ref={flightRef} className="absolute inset-0 block h-full w-full" />
      )}

      {/* The count belongs to arrival only. Between pages there is nothing
          measurable being waited on, and a number climbing to 100 would be
          claiming progress that is not being tracked. It clears before the
          openings widen, so nothing is left floating over the page. */}
      {mode === "intro" && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{ opacity: chromeFade }}
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
